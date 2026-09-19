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

## Enable cloud data sync

The app uses browser local storage in demo mode. Once a person signs in with a configured Firebase project, their finance data is stored in Cloud Firestore at `users/{uid}` and mirrored locally for offline use. The first signed-in session uploads the existing local data only when no cloud document exists; later sign-ins load that user's cloud data.

1. Create a Firebase project and register a web app.
2. In **Authentication → Sign-in method**, enable Google and add `jj-nilbodee.github.io` to **Authorized domains**.
3. In **Firestore Database**, create a production database.
4. Deploy the included [Firestore rules](firestore.rules), replacing `YOUR_PROJECT_ID`:

   ```bash
   npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

5. Enter the Firebase web configuration in the app's Settings screen or supply the `VITE_FIREBASE_*` environment variables at build time.

Do not use Firestore's test mode in production. The included rules allow an authenticated user to access only their own `users/{uid}` document.

## Local development

```bash
npm ci
npm run dev
```

Create a production build with `npm run build`.
