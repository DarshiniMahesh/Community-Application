import { Check } from "lucide-react";

export interface Step {
  id: string;
  name: string;
  href: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full overflow-x-auto py-6">
      <nav aria-label="Progress">
        <ol className="grid min-w-[700px] grid-cols-7">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative flex min-w-0 flex-col items-center">
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className={`absolute left-1/2 right-[-50%] top-5 -z-0 h-0.5 transition-colors ${
                      isCompleted ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors
                        ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCurrent
                            ? "border-primary bg-white text-primary"
                            : "border-gray-300 bg-white text-gray-500"
                        }
                      `}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <span className="font-medium">{index + 1}</span>}
                </div>

                <div className="mt-2 min-h-8 w-full px-1 text-center">
                  <span
                    className={`
                        text-xs font-medium transition-colors
                        ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      `}
                  >
                    {step.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}