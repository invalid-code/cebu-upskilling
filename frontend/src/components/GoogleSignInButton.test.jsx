import { render, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GoogleSignInButton from './GoogleSignInButton';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function setupGoogleGlobal() {
  const idApi = {
    initialize: vi.fn(),
    renderButton: vi.fn(),
    prompt: vi.fn(),
  };
  window.google = { accounts: { id: idApi } };
  return idApi;
}

function findGsiScript() {
  return document.querySelector(`script[src="${GSI_SRC}"]`);
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.google;
    document.head.innerHTML = '';
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    cleanup();
    delete window.google;
    vi.unstubAllEnvs();
  });

  it('renders nothing when no client ID is configured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    const { container } = render(<GoogleSignInButton onSuccess={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(findGsiScript()).toBeNull();
  });

  it('loads the GIS script and renders the Google button', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    const idApi = setupGoogleGlobal();

    render(<GoogleSignInButton onSuccess={vi.fn()} />);

    await waitFor(() => {
      // jsdom never fires load events for injected scripts; simulate it.
      findGsiScript()?.dispatchEvent(new Event('load'));
      expect(idApi.initialize).toHaveBeenCalled();
    });

    expect(idApi.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id.apps.googleusercontent.com' }),
    );
    expect(idApi.renderButton).toHaveBeenCalledTimes(1);
    expect(idApi.renderButton.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });

  it('invokes onSuccess with the returned credential', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    const idApi = setupGoogleGlobal();
    const onSuccess = vi.fn();

    render(<GoogleSignInButton onSuccess={onSuccess} />);

    await waitFor(() => expect(idApi.initialize).toHaveBeenCalled());

    const config = idApi.initialize.mock.calls[0][0];
    config.callback({ credential: 'google-id-token-xyz' });

    expect(onSuccess).toHaveBeenCalledWith('google-id-token-xyz');
  });

  it('invokes onError when the credential is missing from the callback', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    const idApi = setupGoogleGlobal();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />);

    await waitFor(() => expect(idApi.initialize).toHaveBeenCalled());
    idApi.initialize.mock.calls[0][0].callback({});

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
