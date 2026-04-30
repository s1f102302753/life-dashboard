import type { NextPageContext } from "next";

type ErrorPageProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ページの表示に失敗しました</h1>
      <p>{statusCode ? `status: ${statusCode}` : "unexpected error"}</p>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
