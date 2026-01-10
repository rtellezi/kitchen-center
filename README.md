# Kitchen Center API

This is the NestJS backend service for the Horizontal Journal application. It provides API endpoints for managing events, profiles, partners, and stats, utilizing Supabase (PostgreSQL) as the database with Prisma ORM.

## Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Ensure you have a `.env` file with the following variables:
    ```env
    DATABASE_URL="postgresql://..."
    DIRECT_URL="postgresql://..."
    NODE_ENV="development"
    CORS_ORIGINS="http://localhost:5173"   
    ```

3.  **Run the application:**
    ```bash
    npm run start:dev
    ```

## Vercel Deployment

The project is configured for deployment on Vercel.

-   **Build Command:** `npm run build` (This runs `npx prisma generate && nest build` internally to ensure Prisma Client is up-to-date).
-   **Output Directory:** `dist`
-   **Install Command:** `npm install`

### Reconnecting Vercel to `main` Branch

If your Vercel deployment is not automatically triggering on push, or if you need to reconnect it to the `main` branch:

1.  Go to your project dashboard on Vercel.
2.  Navigate to **Settings** > **Git**.
3.  In the **Connected Git Repository** section, verify the repository is connected.
4.  If disconnected or pointing to the wrong branch:
    -   Click **Disconnect** (if currently connected to a wrong repo/branch).
    -   Click **Connect Git Repository**.
    -   Select your GitHub repository (`kitchen-center`).
    -   Ensure the **Production Branch** is set to `main`.
5.  **Trigger a New Deployment:**
    -   Go to the **Deployments** tab.
    -   Click the **...** (three dots) button next to the latest commit or use the "Deploy" button if available.
    -   Select **Redeploy**.
    -   Normally, simply pushing to `main` (`git push origin main`) should trigger a new deployment automatically.

### CORS Configuration

In production, CORS is strict. You must define allowed origins in the Vercel project settings:
-   **Environment Variable:** `CORS_ORIGINS`
-   **Value:** `https://horizontal-journal.vercel.app` (comma-separated for multiple domains).

### Prisma & Caching

Vercel caches dependencies. The `build` script has been modified to run `npx prisma generate` explicitly to prevent "outdated Prisma Client" errors.
