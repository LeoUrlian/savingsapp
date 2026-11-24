import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AuthForm mode="register" />
    </div>
  );
}
