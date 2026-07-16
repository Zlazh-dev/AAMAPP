// Global type declarations for Google Identity Services

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement | null,
    options: {
      theme?: string;
      size?: string;
      width?: number | string;
      text?: string;
      locale?: string;
    },
  ) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface Window {
  google?: {
    accounts: GoogleAccounts;
  };
}
