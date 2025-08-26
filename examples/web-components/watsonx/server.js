#!/usr/bin/env node

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// IBM Cloud IAM token endpoint
app.post("/api/token", async (req, res) => {
  try {
    const apiKey = process.env.WATSONX_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "WATSONX_API_KEY not configured" });
    }

    const tokenUrl = "https://iam.cloud.ibm.com/identity/token";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    const body = new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token request failed:", errorText);
      return res.status(response.status).json({
        error: "Token request failed",
        details: errorText,
      });
    }

    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error("Token endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// watsonx.ai streaming proxy endpoint
app.post("/api/watsonx/stream", async (req, res) => {
  try {
    const { input, access_token } = req.body;

    if (!input || !access_token) {
      return res.status(400).json({ error: "Missing input or access_token" });
    }

    const config = {
      projectId: process.env.WATSONX_PROJECT_ID,
      url: process.env.WATSONX_URL,
      modelId: process.env.WATSONX_MODEL_ID || "ibm/granite-3-8b-instruct",
    };

    if (!config.projectId || !config.url) {
      return res
        .status(500)
        .json({ error: "watsonx.ai configuration missing" });
    }

    const apiUrl = `${config.url}/ml/v1/text/generation_stream?version=2023-05-29`;
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${access_token}`,
    };

    // Add system prompt to encourage proper markdown formatting
    const systemPrompt =
      "You are a helpful AI assistant. When creating tables, lists, or formatted content, always use proper markdown syntax with correct spacing and newlines. For tables, ensure you include the header separator row with dashes (|---|---|).";

    const requestBody = {
      input: `${systemPrompt}\n\nUser: ${input}\n\nAssistant:`,
      model_id: config.modelId,
      project_id: config.projectId,
      parameters: {
        decoding_method: "sample",
        temperature: 0.7,
        top_k: 50,
        top_p: 0.85,
        max_new_tokens: 200,
        repetition_penalty: 1.05,
      },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    // Check if the response is actually SSE format
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType?.includes("text/event-stream")) {
      const errorText = await response.text();
      console.error(
        "watsonx.ai request failed or returned non-SSE:",
        response.status,
        contentType,
        errorText,
      );

      // Set SSE headers first to satisfy fetch-event-source
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Send error as SSE event
      res.write(
        `data: ${JSON.stringify({
          error: "watsonx.ai request failed",
          status: response.status,
          details: errorText,
        })}\n\n`,
      );
      res.end();
      return;
    }

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Pipe the watsonx.ai stream directly to the client
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          res.end();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      res.end();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Stream endpoint error:", error);
    if (!res.headersSent) {
      // Set SSE headers and send error as SSE event
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      res.write(
        `data: ${JSON.stringify({
          error: "Internal server error",
          message: error.message,
        })}\n\n`,
      );
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`watsonx.ai proxy server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Token endpoint: http://localhost:${PORT}/api/token`);
  console.log(
    `Streaming endpoint: http://localhost:${PORT}/api/watsonx/stream`,
  );
});
