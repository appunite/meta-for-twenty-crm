import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  copyToClipboard,
  enqueueSnackbar,
  navigate,
  useColorScheme,
} from 'twenty-sdk/front-component';
import { IconEye, IconEyeOff } from 'twenty-ui/icon';
import { THEME_DARK, THEME_LIGHT } from 'twenty-ui/theme';

import {
  CONNECT_PATH,
  CONNECTION_STATUS_PATH,
  META_WEBHOOK_PATH,
} from 'src/constants/logic-function-universal-identifiers';
import { type ConnectRequest } from 'src/logic-functions/connect';
import {
  APP_DISPLAY_NAME,
  MAIN_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { type ConnectionStatus } from 'src/utils/check-connection';
import { type ConnectResult, type ConnectStep } from 'src/utils/connect-meta';
import { connectionIssues } from 'src/utils/connection-issues';

type FailedLead = { id: string; name: string; errorMessage: string };

type LeadStats = {
  total: number;
  failed: number;
  lastReceivedAt: string | null;
  recentFailures: FailedLead[];
};

type Theme = typeof THEME_LIGHT;

const loadLeadStats = async (): Promise<LeadStats> => {
  const client = new CoreApiClient();
  const [all, failed] = await Promise.all([
    client.query({
      metaLeads: {
        __args: { first: 1, orderBy: [{ createdAt: 'DescNullsLast' }] },
        totalCount: true,
        edges: { node: { createdAt: true } },
      },
    }),
    client.query({
      metaLeads: {
        __args: {
          filter: { status: { eq: 'FAILED' } },
          first: 5,
          orderBy: [{ createdAt: 'DescNullsLast' }],
        },
        totalCount: true,
        edges: { node: { id: true, name: true, errorMessage: true } },
      },
    }),
  ]);

  return {
    total: all.metaLeads?.totalCount ?? 0,
    failed: failed.metaLeads?.totalCount ?? 0,
    lastReceivedAt: all.metaLeads?.edges[0]?.node.createdAt ?? null,
    recentFailures: (failed.metaLeads?.edges ?? []).map(
      ({ node }: NonNullable<typeof failed.metaLeads>['edges'][number]) => ({
        id: node.id,
        name: node.name ?? '',
        errorMessage: node.errorMessage ?? '',
      }),
    ),
  };
};

const buildStyles = (theme: Theme): Record<string, CSSProperties> => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    maxWidth: '720px',
    fontFamily: theme.font.family,
    fontSize: '13px',
    color: theme.font.color.primary,
  },
  title: { fontSize: '20px', fontWeight: 600, margin: 0 },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    border: `1px solid ${theme.border.color.medium}`,
    borderRadius: theme.border.radius.md,
    background: theme.background.secondary,
  },
  heading: { fontSize: '14px', fontWeight: 600, margin: 0 },
  row: { display: 'flex', gap: '8px', alignItems: 'center' },
  spread: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: theme.font.color.tertiary },
  ok: { color: theme.color.green },
  warning: { color: theme.color.orange },
  danger: { color: theme.font.color.danger },
  code: {
    flex: 1,
    fontFamily: 'monospace',
    padding: '6px 8px',
    borderRadius: theme.border.radius.sm,
    background: theme.background.tertiary,
    wordBreak: 'break-all',
  },
  button: {
    fontFamily: theme.font.family,
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: theme.border.radius.sm,
    border: `1px solid ${theme.border.color.strong}`,
    background: theme.background.primary,
    color: theme.font.color.primary,
    cursor: 'pointer',
  },
  link: { color: theme.font.color.secondary, alignSelf: 'flex-start' },
  input: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '6px 8px',
    borderRadius: theme.border.radius.sm,
    border: `1px solid ${theme.border.color.medium}`,
    background: theme.background.primary,
    color: theme.font.color.primary,
  },
  label: { fontWeight: 600 },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: theme.border.radius.sm,
    border: `1px solid ${theme.border.color.strong}`,
    background: theme.background.primary,
    color: theme.font.color.secondary,
    cursor: 'pointer',
  },
});

const STEP_ICONS: Record<ConnectStep['status'], string> = {
  ok: '✓',
  warning: '!',
  failed: '✗',
};

const stepStyle = (
  status: ConnectStep['status'],
  styles: Record<string, CSSProperties>,
) => (status === 'ok' ? styles.ok : status === 'warning' ? styles.warning : styles.danger);

const copyValue = async (value: string, message: string) => {
  await copyToClipboard(value);
  await enqueueSnackbar({ message, variant: 'success' });
};

const ConnectSection = ({ styles }: { styles: Record<string, CSSProperties> }) => {
  const [userToken, setUserToken] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const connect = async (pageId?: string) => {
    setIsConnecting(true);
    setError(null);
    setResult(null);

    try {
      const request: ConnectRequest = {
        userToken,
        ...(pageId ? { pageId } : {}),
        ...(callbackUrl.trim() ? { callbackUrl: callbackUrl.trim() } : {}),
      };
      const next = await new RestApiClient().post<ConnectResult>(
        `/s${CONNECT_PATH}`,
        request,
      );

      setResult(next);
      setIsTokenVisible(false);

      if (next.connection) {
        setUserToken('');
      }
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : String(connectError));
    } finally {
      setIsConnecting(false);
    }
  };

  const connection = result?.connection;

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Connect with a Meta token</h2>
      <span style={styles.muted}>
        Paste your User token and click Connect. Twenty checks the token, links your
        Page to Twenty and shows two values to copy into the app settings.
      </span>
      <span style={styles.muted}>
        You generate the token on developers.facebook.com/tools/explorer. After you
        click Generate Access Token and allow your Page, it sits in the Access token
        box on that page. Save the Meta app secret in the app settings before you
        connect. The setup guide walks you through it.
      </span>
      <div style={styles.row}>
        <input
          type="password"
          autoComplete="off"
          placeholder="User token"
          style={styles.input}
          value={userToken}
          onChange={(event) => setUserToken(event.target.value)}
        />
        <button
          style={styles.button}
          disabled={isConnecting || userToken.trim().length === 0}
          onClick={() => void connect()}
        >
          {isConnecting ? 'Connecting…' : 'Connect'}
        </button>
      </div>
      <details>
        <summary style={styles.muted}>Behind a tunnel? Use a different callback URL</summary>
        <div style={{ ...styles.row, marginTop: '8px' }}>
          <input
            type="url"
            placeholder="https://your-tunnel.example.com"
            style={styles.input}
            value={callbackUrl}
            onChange={(event) => setCallbackUrl(event.target.value)}
          />
        </div>
      </details>
      {error ? <span style={styles.danger}>{error}</span> : null}
      {result?.steps.map((step) => (
        <span key={step.id}>
          <span style={stepStyle(step.status, styles)}>{STEP_ICONS[step.status]}</span>{' '}
          {step.label}
          {step.detail ? <span style={styles.muted}>: {step.detail}</span> : null}
        </span>
      ))}
      {result?.pages ? (
        <div style={{ ...styles.row, flexWrap: 'wrap' }}>
          {result.pages.map((page) => (
            <button
              key={page.id}
              style={styles.button}
              disabled={isConnecting}
              onClick={() => void connect(page.id)}
            >
              {page.name} ({page.id})
            </button>
          ))}
        </div>
      ) : null}
      {connection ? (
        <>
          <span>
            Paste these two values into Settings, Applications, Meta Leads, then click
            Check again.
          </span>
          <span style={styles.label}>Facebook Page ID</span>
          <div style={styles.row}>
            <code style={styles.code}>{connection.pageId}</code>
            <button
              style={styles.button}
              onClick={() => void copyValue(connection.pageId, 'Page ID copied')}
            >
              Copy
            </button>
          </div>
          <span style={styles.label}>Page access token</span>
          <div style={styles.row}>
            <code style={styles.code}>
              {isTokenVisible ? connection.pageAccessToken : '•'.repeat(32)}
            </code>
            <button
              style={styles.iconButton}
              title={isTokenVisible ? 'Hide token' : 'Show token'}
              aria-label={isTokenVisible ? 'Hide token' : 'Show token'}
              onClick={() => setIsTokenVisible((visible) => !visible)}
            >
              {isTokenVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
            <button
              style={styles.button}
              onClick={() =>
                void copyValue(connection.pageAccessToken, 'Page access token copied')
              }
            >
              Copy
            </button>
          </div>
          <span style={styles.muted}>
            Treat the token like a password. It does not expire.
          </span>
          <a href="/settings/applications#installed" style={styles.link}>
            Open app settings
          </a>
        </>
      ) : null}
    </section>
  );
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : 'never';

const ConnectionDetails = ({
  status,
  styles,
}: {
  status: ConnectionStatus;
  styles: Record<string, CSSProperties>;
}) => {
  const issues = connectionIssues(status);

  return (
    <>
      {issues.length === 0 ? (
        <span style={styles.ok}>Everything is set up.</span>
      ) : (
        issues.map((issue) => (
          <span key={issue} style={styles.warning}>
            {issue}
          </span>
        ))
      )}
      {status.page?.ok ? (
        <span style={styles.muted}>
          {status.page.name} ({status.page.pageId}):{' '}
          {status.page.isLeadgenSubscribed ? 'subscribed' : 'not subscribed'},{' '}
          {status.page.formCount} lead forms
        </span>
      ) : null}
    </>
  );
};

const StatusPage = () => {
  const theme = useColorScheme() === 'dark' ? THEME_DARK : THEME_LIGHT;
  const styles = buildStyles(theme);
  const callbackUrl = new RestApiClient().resolveUrl(`/s${META_WEBHOOK_PATH}`);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [nextStatus, nextStats] = await Promise.all([
        new RestApiClient().get<ConnectionStatus>(`/s${CONNECTION_STATUS_PATH}`),
        loadLeadStats(),
      ]);

      setStatus(nextStatus);
      setStats(nextStats);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={styles.page}>
      <div>
        <h1 style={styles.title}>{APP_DISPLAY_NAME}</h1>
        <span style={styles.muted}>
          Leads from Meta instant forms are stored as Meta Leads and linked to People.
        </span>
      </div>

      <section style={styles.section}>
        <h2 style={styles.heading}>Webhook</h2>
        <span style={styles.muted}>
          Connect below registers this address with Meta for you. To do it by hand,
          paste it and your verify token into the Meta app (Webhooks, Page, leadgen).
        </span>
        <div style={styles.row}>
          <code style={styles.code}>{callbackUrl}</code>
          <button style={styles.button} onClick={() => void copyValue(callbackUrl, 'Callback URL copied')}>
            Copy
          </button>
        </div>
      </section>

      <ConnectSection styles={styles} />

      <section style={styles.section}>
        <div style={styles.spread}>
          <h2 style={styles.heading}>Connection</h2>
          <button
            style={styles.button}
            disabled={isLoading}
            onClick={() => void load()}
          >
            {isLoading ? 'Checking…' : 'Check again'}
          </button>
        </div>
        {loadError ? <span style={styles.danger}>{loadError}</span> : null}
        {status ? <ConnectionDetails status={status} styles={styles} /> : null}
        <a href="/settings/applications#installed" style={styles.link}>
          Open app settings
        </a>
      </section>

      <section style={styles.section}>
        <div style={styles.spread}>
          <h2 style={styles.heading}>Leads</h2>
          <button
            style={styles.button}
            onClick={() =>
              void navigate(AppPath.RecordIndexPage, { objectNamePlural: 'metaLeads' })
            }
          >
            Open Meta Leads
          </button>
        </div>
        {stats ? (
          <>
            <span>
              {stats.total} received, {stats.failed} failed. Last received{' '}
              {formatDate(stats.lastReceivedAt)}.
            </span>
            {stats.recentFailures.map((lead) => (
              <span key={lead.id}>
                <strong>{lead.name}</strong>:{' '}
                <span style={styles.danger}>{lead.errorMessage}</span>
              </span>
            ))}
          </>
        ) : null}
      </section>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MAIN_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'meta-leads-status',
  description: 'Webhook callback URL, connection health and recent lead failures',
  component: StatusPage,
});
