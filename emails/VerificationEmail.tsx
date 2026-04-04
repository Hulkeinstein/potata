import type { CSSProperties } from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
} from "@react-email/components";

interface VerificationEmailProps {
  name: string;
  code: string;
}

export const VerificationEmail = ({ name, code }: VerificationEmailProps) => {
  return (
    <Html lang="ko">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>이메일 인증 코드</Heading>
          <Text style={text}>안녕하세요 {name}님,</Text>
          <Text style={text}>
            가입을 진행해 주셔서 감사합니다. 아래의 인증 코드를 입력하여 이메일 인증을 완료해 주세요.
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={footer}>
            본인이 요청하지 않은 경우 이 이메일을 무시해 주세요. 본 코드는 제한된 시간 동안에만 유효합니다.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main: CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container: CSSProperties = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const h1: CSSProperties = {
  color: "#333",
  fontSize: "24px",
  fontWeight: 600,
  padding: "0",
  margin: "30px 0",
  textAlign: "center",
};

const text: CSSProperties = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0",
};

const codeBox: CSSProperties = {
  background: "#f4f4f5",
  borderRadius: "8px",
  marginTop: "20px",
  marginBottom: "20px",
  padding: "24px",
  textAlign: "center",
};

const codeText: CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "6px",
  color: "#000",
  margin: "0",
};

const footer: CSSProperties = {
  color: "#9ca3af",
  fontSize: "14px",
  marginTop: "40px",
  textAlign: "center",
};

export default VerificationEmail;
