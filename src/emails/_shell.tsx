import { Body, Container, Head, Heading, Html, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

// Shared layout for all v2 transactional emails (600px max width, Korean copy,
// plain fallback fonts).
// See phase5/design_spec.md §2.3.

export interface EmailShellProps {
  title: string;
  children: ReactNode;
}

export default function EmailShell({ title, children }: EmailShellProps) {
  return (
    <Html lang="ko">
      <Head />
      <Body style={bodyStyle}>
        <Container style={wrapStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>Aura-board</Text>
          </Section>
          <Section style={bodySectionStyle}>
            <Heading style={headingStyle}>{title}</Heading>
            {children}
          </Section>
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>학교 대표 연락처를 통해 문의하실 수 있습니다.</Text>
            <Text style={footerMicroStyle}>Aura-board · 자동 발송</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f5f4",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  margin: 0,
  padding: "24px 0",
};
const wrapStyle = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden" as const,
};
const headerStyle = {
  padding: "24px 32px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
};
const logoStyle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "#0075de",
};
const bodySectionStyle = {
  padding: "32px",
};
const headingStyle = {
  margin: "0 0 16px 0",
  fontSize: "20px",
  fontWeight: 700,
  color: "#111",
  lineHeight: "1.4",
};
const footerStyle = {
  padding: "16px 32px 24px",
  borderTop: "1px solid rgba(0,0,0,0.06)",
};
const footerTextStyle = {
  margin: "0 0 4px 0",
  fontSize: "13px",
  color: "#615d59",
};
const footerMicroStyle = {
  margin: 0,
  fontSize: "12px",
  color: "#a39e98",
};

export const bodyText = {
  margin: "0 0 12px 0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#555",
};

export const ctaLink = {
  display: "inline-block" as const,
  marginTop: "16px",
  padding: "12px 20px",
  backgroundColor: "#0075de",
  color: "#ffffff",
  borderRadius: "4px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none" as const,
};
