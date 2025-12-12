# Test Backend

This is a minimal NestJS backend configured for deployment on Vercel.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally:
   ```bash
   npm run start:dev
   ```
   The API will be available at `http://localhost:3000`.
   Swagger documentation: `http://localhost:3000/docs`.

## Configuration

Copy `sample.env` to `.env` and fill in the values:

```bash
cp sample.env .env  
```

Required environment variables:
- `HF_TOKEN`: Your Hugging Face API token.

## Deployment to Vercel

1. **Push to Git**: Ensure this code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

2. **Import in Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard).
   - Click "Add New..." -> "Project".
   - Select your Git repository.
   - Vercel should automatically detect the project settings. If not:
     - Framework Preset: `Other`
     - Root Directory: `test-backend` (if it's in a subdirectory) or `./`
     - Build Command: `npm run build`
     - Output Directory: `dist` (though Vercel serverless functions don't strictly use this for serving, it's good practice)

3. **Deploy**: Click "Deploy".

## Testing

Once deployed, you can access the API at your Vercel URL (e.g., `https://your-project.vercel.app`).

### Endpoints

- **Health Check**:
  - URL: `https://your-app.vercel.app/health`
  - Method: `GET`
  - Response:
    ```json
    {
      "status": "ok",
      "timestamp": "...",
      "service": "test-backend"
    }
    ```

- **Chemistry Fact Generation**:
  - URL: `https://your-app.vercel.app/chemistry/fact`
  - Method: `POST`
  - Body:
    ```json
    {
      "prompt": "Generate a fact about the psychology of love."
    }
    ```

- **Swagger Documentation**:
  - URL: `https://your-app.vercel.app/docs`

### Troubleshooting

If endpoints are not accessible on Vercel:

1. **Check Environment Variables**: Ensure all required environment variables are set in Vercel Project Settings:
   - `HF_TOKEN` (required)
   - `CORS_ORIGINS` (optional, defaults to localhost)
   - Other HF_* variables (optional, have defaults)

2. **Check Build Logs**: In Vercel Dashboard, check the build logs to ensure the build completed successfully.

3. **Check Function Logs**: In Vercel Dashboard, go to the Functions tab and check runtime logs for any errors.

4. **Verify Routes**: The `vercel.json` routes all requests to `/api/index.ts`. Make sure this file is properly built and deployed.

5. **Test Locally**: Run `npm run start:dev` and verify all endpoints work locally before deploying.

