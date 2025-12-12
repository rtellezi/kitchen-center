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
  - URL: `/api/health` or `/health` (depending on Vercel rewrite rules, usually handled by `vercel.json` rewrites to `/api/index.ts` but the controller path is `/health`, so typically `/api/health` effectively if the express app handles routing from root, but vercel.json routes `/(.*)` to `/api/index.ts`. NestJS app inside assumes root based. So `https://your-app.vercel.app/health` should work).
  - Method: `GET`
  - Response:
    ```json
    {
      "status": "ok",
      "timestamp": "...",
      "service": "test-backend"
    }
    ```

- **Swagger Documentation**:
  - URL: `/docs`

