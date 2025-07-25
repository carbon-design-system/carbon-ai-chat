# watsonx.ai Web Components Example

This example demonstrates how to integrate the Carbon AI Chat web component with IBM watsonx.ai for streaming text generation. The example includes a vanilla JavaScript frontend using web components and a Node.js proxy server to handle authentication and API calls.

## Features

- **Real-time streaming** from watsonx.ai with typewriter effect
- **Markdown support** including tables, lists, and formatted content
- **CORS-free architecture** using Express proxy server
- **Professional SSE handling** with `@microsoft/fetch-event-source`
- **Smart token buffering** to preserve markdown structure
- **Error handling** with graceful fallbacks
- **Web Components** using Lit for framework-agnostic implementation

## Prerequisites

- Node.js 22+ and npm
- IBM Cloud account with watsonx.ai access
- watsonx.ai project set up

## Setup Instructions

### Step 1: Get Your IBM Cloud API Key

1. **Log in to IBM Cloud**: Go to [https://cloud.ibm.com](https://cloud.ibm.com)
2. **Navigate to API Keys**: Go to [Manage > Access (IAM) > API keys](https://cloud.ibm.com/iam/apikeys)
3. **Create API Key**:
   - Click "Create an IBM Cloud API key"
   - Enter a name and description
   - Click "Create"
   - **Important**: Copy and save the API key immediately (you won't be able to see it again)

### Step 2: Set Up watsonx.ai Project

1. **Access watsonx.ai**: Go to [https://dataplatform.cloud.ibm.com/wx](https://dataplatform.cloud.ibm.com/wx)
2. **Create or select a project**:
   - If you don't have a project, create one
   - Make note of your Project ID (found in project settings)
3. **Verify your region**: Note which IBM Cloud region your watsonx.ai instance is in (e.g., `us-south`, `eu-de`)

### Step 3: Choose Your Model

You can find the complete list of available models in your watsonx.ai project dashboard or in the [IBM watsonx.ai documentation](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html). The example is configured to use `ibm/granite-3-8b-instruct` by default, but you can change this by setting the `WATSONX_MODEL_ID` environment variable.

### Step 4: Configure Environment Variables

1. **Copy the example environment file**:

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your credentials:

   ```bash
   # IBM Cloud API Key (required)
   WATSONX_API_KEY=your-ibm-cloud-api-key-here

   # watsonx.ai Project ID (required)
   WATSONX_PROJECT_ID=your-project-id-here

   # watsonx.ai API URL (required)
   # Replace region with your IBM Cloud region
   WATSONX_URL=https://us-south.ml.cloud.ibm.com

   # Model ID (optional, defaults to ibm/granite-3-8b-instruct)
   WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
   ```

### Step 5: Install Dependencies

```bash
npm install
```

### Step 6: Run the Application

Start both the proxy server and web components development server:

```bash
npm run start
```

This command runs:

- **Proxy server** on `http://localhost:3011` (handles IBM Cloud authentication)
- **Web components app** on `http://localhost:3005` (the chat interface)

Alternatively, you can run them separately:

```bash
# Terminal 1: Start the proxy server
npm run start:server

# Terminal 2: Start the web components app
npm start:client
```
