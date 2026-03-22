import { YaotoshiAuth } from '@yaotoshi/auth-sdk'

export const auth = new YaotoshiAuth({
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URI,
  postLogoutRedirectUri: import.meta.env.VITE_AUTH_POST_LOGOUT_URI,
  accountsUrl: import.meta.env.VITE_AUTH_ACCOUNTS_URL,
  scopes: ['openid', 'email'],
})
