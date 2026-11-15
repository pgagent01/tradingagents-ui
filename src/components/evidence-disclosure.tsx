import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export function EvidenceDisclosure({title,children,defaultOpen=false}:{title:string;children:ReactNode;defaultOpen?:boolean}) {
  const [open,setOpen]=useState(defaultOpen);
  return <Collapsible open={open} onOpenChange={setOpen} className="space-y-3 border-b border-border pb-3 print:border-0">
    <CollapsibleTrigger asChild><Button variant="ghost" className="h-auto w-full justify-start whitespace-normal px-0 text-left print:hidden">{open?<ChevronDown className="h-4 w-4 shrink-0"/>:<ChevronRight className="h-4 w-4 shrink-0"/>}<span className="text-base font-semibold">{title}</span></Button></CollapsibleTrigger>
    <CollapsibleContent forceMount className="data-[state=closed]:hidden print:!block">{children}</CollapsibleContent>
  </Collapsible>;
}