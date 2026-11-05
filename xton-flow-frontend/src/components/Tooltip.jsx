function Tooltip({ label, children }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip-box" role="tooltip">{label}</span>
    </span>
  );
}

export default Tooltip;
