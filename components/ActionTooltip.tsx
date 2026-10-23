import React, { useId } from 'react';

export const ActionTooltip = ({ text, children }: { text: string; children: React.ReactElement<any> }) => {
  const id = useId();
  return <span className="group/action relative inline-flex">
    {React.cloneElement(children, { 'aria-describedby': id })}
    <span id={id} role="tooltip" className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 w-max max-w-[240px] rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/action:visible group-hover/action:opacity-100 group-focus-within/action:visible group-focus-within/action:opacity-100">
      {text}
    </span>
  </span>;
};
