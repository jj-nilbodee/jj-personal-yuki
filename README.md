# Yuki Finance

A personal finance hub for expenses, investments, Thai tax planning, and loan repayment.

## Host on GitHub Pages

This repository includes a GitHub Actions workflow that builds and publishes the app whenever changes are pushed to `main`.

1. In the repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Push the included workflow to `main`.
4. When the **Deploy to GitHub Pages** workflow completes, the app will be available at `https://jj-nilbodee.github.io/jj-personal-yuki/`.

The app works in demo mode without any credentials. For production Google sign-in, create a Firebase web app, enable Google as a Firebase Authentication provider, and add `jj-nilbodee.github.io` to Firebase Authentication's authorized domains. You can provide the public Firebase web configuration either in the in-app settings or through deployment environment variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Firebase web configuration values are intended to be public identifiers; secure access using Firebase Authentication and Firestore Security Rules, rather than treating the API key as a secret.

## Local development

```bash
npm ci
npm run dev
```

Create a production build with `npm run build`.
