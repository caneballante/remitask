import { RemiTaskApp, RemiTaskErrorBoundary } from "@/components/remitask-app";

export default function PersonalPage() {
  return (
    <RemiTaskErrorBoundary>
      <RemiTaskApp space="personal" />
    </RemiTaskErrorBoundary>
  );
}
