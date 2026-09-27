import * as React from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
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
  postalAddress?: string | null;
  requirePostal?: boolean;
};

export type EmailShellProps = {
  branding: OrgEmailBranding;
  preview: string;
  children: React.ReactNode;
  footer: EmailFooterProps;
  preheader?: string;
  productName: string;
};

const outerBg = { backgroundColor: "#f4f5f7", margin: 0 };
const cardStyle = {
  backgroundColor: "#ffffff",
  margin: "24px auto",
  padding: "32px 28px",
  borderRadius: "8px",
  maxWidth: "600px",
  width: "100%",
  border: "1px solid #dfe1e6",
};
const logoBoxStyle = {
  backgroundColor: "#ffffff",
  padding: "12px 16px",
  borderRadius: "6px",
  border: "1px solid #ebecf0",
  display: "inline-block" as const,
};
const btnStyle = {
  backgroundColor: "#0052CC",
  color: "#ffffff",
  height: "44px",
  lineHeight: "44px",
  padding: "0 24px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: 600,
  fontSize: "15px",
  textAlign: "center" as const,
  boxSizing: "border-box" as const,
};
const tableLabel = { fontSize: "12px", color: "#6b778c", margin: "0 0 4px", textTransform: "uppercase" as const };
const tableValue = { fontSize: "14px", color: "#172b4d", margin: 0, fontWeight: 500 as const };
const quoteStyle = {
  borderLeft: "3px solid #dfe1e6",
  paddingLeft: "12px",
  margin: "12px 0",
  color: "#44546f",
  fontSize: "14px",
  lineHeight: "22px",
};

export function EmailShell({ branding, preview, children, footer, preheader, productName }: EmailShellProps) {
  const supabaseUrl = branding.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const logoUrl = getOrgLogoPublicUrl(supabaseUrl, branding.orgId, branding.logoWidePath);
  const pre = preheader ?? preview;

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .email-outer { background-color: #1d2125 !important; }
            .email-card { background-color: #22272b !important; border-color: #38414a !important; }
            .email-text { color: #b6c2cf !important; }
            .email-heading { color: #dee4ea !important; }
            .logo-box { background-color: #ffffff !important; }
          }
        `}</style>
      </Head>
      <Preview>{pre}</Preview>
      <Body style={outerBg} className="email-outer">
        <Container style={cardStyle} className="email-card">
          <Section style={{ marginBottom: "20px" }}>
            <div style={logoBoxStyle} className="logo-box">
              {logoUrl ? (
                <Img src={logoUrl} alt={branding.orgName} height={32} style={{ maxWidth: "200px", display: "block" }} />
              ) : (
                <Text style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#172b4d" }} className="email-heading">
                  {branding.orgName}
                </Text>
              )}
            </div>
          </Section>
          {children}
          <Hr style={{ borderColor: "#dfe1e6", margin: "28px 0 16px" }} />
          <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#6b778c", margin: "0 0 8px" }} className="email-text">
            {footer.reason}
          </Text>
          <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#6b778c", margin: "0 0 8px" }}>
            <Link href={footer.manageNotificationsUrl} style={{ color: "#0052CC" }}>
              Manage notifications
            </Link>
            {footer.unsubscribeUrl ? (
              <>
                {" · "}
                <Link href={footer.unsubscribeUrl} style={{ color: "#0052CC" }}>
                  Unsubscribe
                </Link>
              </>
            ) : null}
          </Text>
          {(footer.requirePostal || footer.postalAddress) && footer.postalAddress ? (
            <Text style={{ fontSize: "11px", lineHeight: "16px", color: "#8993a4", margin: "8px 0 0", whiteSpace: "pre-line" }}>
              {footer.postalAddress}
            </Text>
          ) : null}
          <Text style={{ fontSize: "11px", color: "#8993a4", margin: "12px 0 0" }}>
            {productName} · {branding.orgName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function TaskDetailsTable(props: {
  title: string;
  status?: string;
  dueDate?: string;
  assignee?: string;
}) {
  return (
    <Section style={{ marginBottom: "20px", backgroundColor: "#f7f8f9", borderRadius: "6px", padding: "12px 16px" }}>
      <Row>
        <Column style={{ width: "50%", paddingRight: "8px", verticalAlign: "top" }}>
          <Text style={tableLabel}>Task</Text>
          <Text style={tableValue} className="email-heading">
            {props.title}
          </Text>
        </Column>
        <Column style={{ width: "50%", paddingLeft: "8px", verticalAlign: "top" }}>
          <Text style={tableLabel}>Status</Text>
          <Text style={tableValue}>{props.status ?? "—"}</Text>
        </Column>
      </Row>
      <Row style={{ marginTop: "12px" }}>
        <Column style={{ width: "50%", paddingRight: "8px" }}>
          <Text style={tableLabel}>Due</Text>
          <Text style={tableValue}>{props.dueDate ?? "—"}</Text>
        </Column>
        <Column style={{ width: "50%", paddingLeft: "8px" }}>
          <Text style={tableLabel}>Assignee</Text>
          <Text style={tableValue}>{props.assignee ?? "—"}</Text>
        </Column>
      </Row>
    </Section>
  );
}

export function QuoteBlock({ children }: { children: React.ReactNode }) {
  return <Text style={quoteStyle}>{children}</Text>;
}

export function OpenTaskButton({ href, label = "Open task" }: { href: string; label?: string }) {
  return (
    <Section style={{ marginTop: "20px", textAlign: "center" as const }}>
      <Button href={href} style={btnStyle}>
        {label}
      </Button>
    </Section>
  );
}

export function defaultFooter(input: {
  appUrl: string;
  orgId: string;
  reason: string;
  unsubscribeUrl?: string;
  postalAddress?: string | null;
  requirePostal?: boolean;
}): EmailFooterProps {
  return {
    reason: input.reason,
    manageNotificationsUrl: `${input.appUrl}/settings/notifications`,
    unsubscribeUrl: input.unsubscribeUrl,
    postalAddress: input.postalAddress,
    requirePostal: input.requirePostal,
  };
}
