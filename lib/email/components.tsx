import * as React from "react";
import { Body, Head, Html, Img, Link, Preview } from "@react-email/components";
import { getOrgLogoPublicUrl } from "@/lib/org/logo-url";

export type OrgEmailBranding = {
  orgId: string;
  orgName: string;
  logoWidePath?: string | null;
  supabaseUrl?: string;
  postalAddress?: string | null;
};

export type EmailFooterProps = {
  reason: string;
  manageNotificationsUrl: string;
  unsubscribeUrl?: string;
  unsubscribeLabel?: string;
  postalLine?: string | null;
};

export type EmailShellProps = {
  branding: OrgEmailBranding;
  preview: string;
  children: React.ReactNode;
  footer: EmailFooterProps;
  preheader?: string;
  productName: string;
};

const fontStack = "-apple-system,Segoe UI,Roboto,Arial,sans-serif";

export const emailDarkModeStyles = `
  :root{color-scheme:light dark;supported-color-schemes:light dark}
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  a{color:#0052CC}
  @media (max-width:620px){.card{padding:24px 20px!important}.h1{font-size:20px!important}}
  @media (prefers-color-scheme:dark){
    .bg{background:#1D2125!important}
    .card{background:#22272B!important;border-color:#38414A!important}
    .h1,.strong{color:#DEE4EA!important}
    .body{color:#B6C2CF!important}
    .muted{color:#8C9BAB!important}
    .row{border-color:#38414A!important}
    .pill-over{background:#5D1F1A!important;color:#FFD5D2!important}
    .pill-due{background:#533F04!important;color:#F8E6A0!important}
    .stat{background:#2C333A!important}
    .stat-over{background:#5D1F1A!important}
    .over-t{color:#FFD5D2!important}
    .link{color:#85B8FF!important}
    .hr{border-color:#38414A!important}
  }
  [data-ogsc] .h1,[data-ogsc] .strong{color:#DEE4EA!important}
  [data-ogsc] .body{color:#B6C2CF!important}
  [data-ogsb] .card{background:#22272B!important}
`;

export function EmailShell({ branding, preview, children, footer, preheader, productName }: EmailShellProps) {
  const supabaseUrl = branding.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoUrl = getOrgLogoPublicUrl(supabaseUrl, branding.orgId, branding.logoWidePath);
  const pre = preheader ?? preview;
  const unsubLabel = footer.unsubscribeLabel ?? "Unsubscribe";

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{emailDarkModeStyles}</style>
      </Head>
      <Preview>{pre}</Preview>
      <Body className="bg" style={{ margin: 0, padding: 0, background: "#F4F5F7" }}>
        <div
          style={{
            display: "none",
            maxHeight: 0,
            overflow: "hidden",
            opacity: 0,
          }}
        >
          {pre}
        </div>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          className="bg"
          style={{ background: "#F4F5F7" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: "600px" }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: "0 4px 16px 4px" }}>
                        <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody>
                            <tr>
                              <td style={{ background: "#FFFFFF", borderRadius: "8px", padding: "8px 12px" }}>
                                {logoUrl ? (
                                  <Img
                                    src={logoUrl}
                                    alt={branding.orgName}
                                    height={20}
                                    style={{ maxWidth: "200px", display: "block" }}
                                  />
                                ) : (
                                  <span
                                    className="strong"
                                    style={{
                                      font: `700 15px/20px ${fontStack}`,
                                      color: "#172B4D",
                                    }}
                                  >
                                    {branding.orgName}
                                  </span>
                                )}
                              </td>
                              <td
                                className="muted"
                                style={{
                                  paddingLeft: "10px",
                                  font: `500 13px/20px ${fontStack}`,
                                  color: "#626F86",
                                }}
                              >
                                {productName}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="card"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #DFE1E6",
                          borderRadius: "12px",
                          padding: "32px 32px",
                        }}
                      >
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          border={0}
                          style={{ fontFamily: fontStack }}
                        >
                          <tbody>{children}</tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="muted"
                        style={{
                          padding: "20px 8px",
                          font: `13px/19px ${fontStack}`,
                          color: "#626F86",
                        }}
                      >
                        {footer.reason}
                        <br />
                        <Link href={footer.manageNotificationsUrl} className="link" style={{ color: "#0052CC" }}>
                          Notification settings
                        </Link>
                        {footer.unsubscribeUrl ? (
                          <>
                            {" "}
                            &nbsp;·&nbsp;{" "}
                            <Link href={footer.unsubscribeUrl} className="link" style={{ color: "#0052CC" }}>
                              {unsubLabel}
                            </Link>
                          </>
                        ) : null}
                        {footer.postalLine ? (
                          <>
                            <br />
                            <br />
                            {footer.postalLine}
                          </>
                        ) : null}
                        <br />
                        {`Sent by ${productName}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td
        className="h1"
        style={{
          fontSize: "22px",
          lineHeight: "28px",
          fontWeight: 700,
          color: "#172B4D",
          paddingBottom: "6px",
        }}
      >
        {children}
      </td>
    </tr>
  );
}

export function EmailParagraph({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <tr>
      <td
        className={muted ? "muted" : "body"}
        style={{
          fontSize: "15px",
          lineHeight: "22px",
          color: muted ? "#626F86" : "#44546F",
          paddingBottom: "16px",
        }}
      >
        {children}
      </td>
    </tr>
  );
}

export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <tr>
      <td align="center" style={{ paddingTop: "24px" }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
          <tbody>
            <tr>
              <td align="center" style={{ borderRadius: "8px", backgroundColor: "#0052CC" }}>
                <Link
                  href={href}
                  style={{
                    display: "inline-block",
                    padding: "13px 28px",
                    font: `600 16px/20px ${fontStack}`,
                    color: "#FFFFFF",
                    textDecoration: "none",
                    borderRadius: "8px",
                  }}
                >
                  {label}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export function DigestStatsRow(props: { openCount: number; dueTodayCount: number; overdueCount: number }) {
  return (
    <tr>
      <td style={{ paddingBottom: "20px" }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
          <tbody>
            <tr>
              <td className="stat" width="33%" style={{ background: "#F4F5F7", borderRadius: "8px", padding: "12px" }}>
                <div className="strong" style={{ fontSize: "22px", lineHeight: "28px", fontWeight: 700, color: "#172B4D" }}>
                  {props.openCount}
                </div>
                <div className="muted" style={{ fontSize: "13px", lineHeight: "18px", color: "#626F86" }}>
                  Open
                </div>
              </td>
              <td width={8} />
              <td className="stat" width="33%" style={{ background: "#F4F5F7", borderRadius: "8px", padding: "12px" }}>
                <div className="strong" style={{ fontSize: "22px", lineHeight: "28px", fontWeight: 700, color: "#172B4D" }}>
                  {props.dueTodayCount}
                </div>
                <div className="muted" style={{ fontSize: "13px", lineHeight: "18px", color: "#626F86" }}>
                  Due today
                </div>
              </td>
              <td width={8} />
              <td
                className="stat-over"
                width="33%"
                style={{ background: "#FFECEB", borderRadius: "8px", padding: "12px" }}
              >
                <div className="over-t" style={{ fontSize: "22px", lineHeight: "28px", fontWeight: 700, color: "#AE2E24" }}>
                  {props.overdueCount}
                </div>
                <div className="over-t" style={{ fontSize: "13px", lineHeight: "18px", color: "#AE2E24" }}>
                  Overdue
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export function DigestTaskRow(props: {
  title: string;
  url: string;
  dueKind: "overdue" | "due_today" | "none";
  dueDateFormatted?: string;
  statusLabel: string;
  metaSuffix: string;
  isLast?: boolean;
}) {
  let pill: React.ReactNode = null;
  if (props.dueKind === "overdue") {
    pill = (
      <span
        className="pill-over"
        style={{
          display: "inline-block",
          marginTop: "6px",
          background: "#FFECEB",
          color: "#AE2E24",
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 600,
          borderRadius: "4px",
          padding: "1px 8px",
        }}
      >
        Overdue · {props.dueDateFormatted}
      </span>
    );
  } else if (props.dueKind === "due_today") {
    pill = (
      <span
        className="pill-due"
        style={{
          display: "inline-block",
          marginTop: "6px",
          background: "#FFF7D6",
          color: "#7F5F01",
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 600,
          borderRadius: "4px",
          padding: "1px 8px",
        }}
      >
        Due today
      </span>
    );
  }

  const borderBottom = props.isLast ? "1px solid #DFE1E6" : undefined;

  return (
    <tr>
      <td
        className="row"
        style={{
          borderTop: "1px solid #DFE1E6",
          borderBottom,
          padding: "14px 0",
        }}
      >
        <Link
          href={props.url}
          className="strong"
          style={{
            fontSize: "15px",
            lineHeight: "22px",
            fontWeight: 600,
            color: "#172B4D",
            textDecoration: "none",
          }}
        >
          {props.title}
        </Link>
        <br />
        {pill}
        {pill ? (
          <span className="muted" style={{ fontSize: "13px", color: "#626F86" }}>
            {" "}
            &nbsp; {props.statusLabel} · {props.metaSuffix}
          </span>
        ) : (
          <span className="muted" style={{ fontSize: "13px", color: "#626F86", display: "block", marginTop: "6px" }}>
            {props.statusLabel} · {props.metaSuffix}
          </span>
        )}
      </td>
    </tr>
  );
}

export function TaskDetailsTable(props: {
  title: string;
  status?: string;
  dueDate?: string;
  assignee?: string;
}) {
  const labelStyle = {
    fontSize: "12px",
    color: "#626F86",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
  };
  const valueStyle = { fontSize: "14px", color: "#172B4D", margin: 0, fontWeight: 500 as const };
  return (
    <tr>
      <td style={{ paddingBottom: "20px" }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ background: "#F4F5F7", borderRadius: "8px", padding: "12px 16px" }}
          className="stat"
        >
          <tbody>
            <tr>
              <td width="50%" style={{ paddingRight: "8px", verticalAlign: "top" }}>
                <div style={labelStyle} className="muted">
                  Task
                </div>
                <div className="strong" style={valueStyle}>
                  {props.title}
                </div>
              </td>
              <td width="50%" style={{ paddingLeft: "8px", verticalAlign: "top" }}>
                <div style={labelStyle} className="muted">
                  Status
                </div>
                <div className="body" style={{ ...valueStyle, fontWeight: 400 }}>
                  {props.status ?? "—"}
                </div>
              </td>
            </tr>
            <tr>
              <td width="50%" style={{ paddingRight: "8px", paddingTop: "12px" }}>
                <div style={labelStyle} className="muted">
                  Due
                </div>
                <div className="body" style={{ ...valueStyle, fontWeight: 400 }}>
                  {props.dueDate ?? "—"}
                </div>
              </td>
              <td width="50%" style={{ paddingLeft: "8px", paddingTop: "12px" }}>
                <div style={labelStyle} className="muted">
                  Assignee
                </div>
                <div className="body" style={{ ...valueStyle, fontWeight: 400 }}>
                  {props.assignee ?? "—"}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export function QuoteBlock({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td
        className="body"
        style={{
          borderLeft: "3px solid #DFE1E6",
          paddingLeft: "12px",
          margin: "12px 0",
          color: "#44546F",
          fontSize: "14px",
          lineHeight: "22px",
          paddingBottom: "12px",
        }}
      >
        {children}
      </td>
    </tr>
  );
}

/** @deprecated Use EmailButton */
export function OpenTaskButton({ href, label = "Open task" }: { href: string; label?: string }) {
  return <EmailButton href={href} label={label} />;
}

export function defaultFooter(input: {
  appUrl: string;
  orgId: string;
  reason: string;
  unsubscribeUrl?: string;
  unsubscribeLabel?: string;
  postalLine?: string | null;
}): EmailFooterProps {
  return {
    reason: input.reason,
    manageNotificationsUrl: `${input.appUrl}/settings/notifications`,
    unsubscribeUrl: input.unsubscribeUrl,
    unsubscribeLabel: input.unsubscribeLabel,
    postalLine: input.postalLine,
  };
}

export function orgPostalLine(branding: OrgEmailBranding): string | null {
  const addr = branding.postalAddress?.trim();
  if (!addr) return null;
  return `${branding.orgName} · ${addr}`;
}
