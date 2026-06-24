import { RemiTaskApp, RemiTaskErrorBoundary } from "@/components/remitask-app";

export default function Home() {
  return (
    <RemiTaskErrorBoundary>
      <RemiTaskApp />
    </RemiTaskErrorBoundary>
  );
}
