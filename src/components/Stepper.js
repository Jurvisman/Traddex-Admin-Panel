function Stepper({ steps, activeIndex }) {
  return (
    <div className="stepper">
      {steps.map((item, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'next';
        return (
          <div key={item.key} className={`step ${state}`}>
            <div className="step-index">{index + 1}</div>
            <div>
              <div className="step-title">{item.title}</div>
              <div className="step-sub">{item.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
