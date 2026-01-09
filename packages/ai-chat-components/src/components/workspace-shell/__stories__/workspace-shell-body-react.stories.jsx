/* eslint-disable react/forbid-dom-props */
import React from "react";
import WorkspaceShell, {
  WorkspaceShellBody,
} from "../../../react/workspace-shell";
import { getBodyContent } from "./story-helper-react";
import "./story-styles.scss";

export default {
  title: "Components/Workspace shell/Body",
  component: WorkspaceShellBody,
  parameters: {
    docs: {
      description: {
        component:
          "Main content area of the workspace shell. Provides a scrollable container for workspace content.",
      },
    },
  },
  argTypes: {
    contentType: {
      control: {
        type: "select",
      },
      options: {
        "Short text": "short",
        "Long text": "long",
      },
      description: "Type of content to display in the body",
    },
  },
};

export const Default = {
  args: {
    contentType: "short",
  },
  render: ({ contentType }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>{getBodyContent(contentType)}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const LongContent = {
  args: {
    contentType: "long",
  },
  render: ({ contentType }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>{getBodyContent(contentType)}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithCustomContent = {
  render: () => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div style={{ padding: "1rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Custom Content Example</h3>
          <p style={{ marginBottom: "1rem" }}>
            This body can contain any custom HTML or components. The content
            will automatically scroll if it exceeds the available height.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "var(--cds-layer-01)",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ marginBottom: "0.5rem" }}>Card 1</h4>
              <p>Custom card content</p>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--cds-layer-01)",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ marginBottom: "0.5rem" }}>Card 2</h4>
              <p>Custom card content</p>
            </div>
            <div
              style={{
                padding: "1rem",
                background: "var(--cds-layer-01)",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ marginBottom: "0.5rem" }}>Card 3</h4>
              <p>Custom card content</p>
            </div>
          </div>
        </div>
      </WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const EmptyState = {
  render: () => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h3 style={{ marginBottom: "1rem" }}>No content available</h3>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            This workspace is empty. Add content to get started.
          </p>
        </div>
      </WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

// Made with Bob
