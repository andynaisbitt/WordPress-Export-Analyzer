interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: string;
}

export const StepperV2: React.FC<StepperProps> = ({ steps, currentStep }) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div key={step.id} className="stepper-step">
          <div className={`stepper-dot${index <= currentStepIndex ? ' stepper-dot-active' : ''}`}>
            {index + 1}
          </div>
          <div className="stepper-label">{step.label}</div>
          {index < steps.length - 1 && (
            <div className={`stepper-line${index < currentStepIndex ? ' stepper-line-active' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
};
