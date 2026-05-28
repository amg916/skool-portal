import { useEffect } from "react";
import { Redirect } from "wouter";

export default function SignupPage() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);
  return <Redirect to="/login" />;
}
