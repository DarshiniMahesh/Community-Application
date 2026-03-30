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
    <div className="w-full py-6">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {/* Step Circle */}
                    <div
                      className={`
                        relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors
                        ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCurrent
                            ? "border-primary bg-white text-primary"
                            : "border-gray-300 bg-white text-gray-500"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Connecting Line */}
                    {!isLast && (
                      <div
                        className={`
                          h-0.5 flex-1 transition-colors mx-2
                          ${isCompleted ? "bg-primary" : "bg-gray-300"}
                        `}
                      />
                    )}
                  </div>

                  {/* Step Name */}
                  <div className="mt-2 text-center">
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
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}