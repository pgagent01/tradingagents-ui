import { useRouter,type ErrorComponentProps } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
export function DataError({error,reset}:ErrorComponentProps) {
  const router=useRouter();
  return <div className="space-y-3 py-8"><h1 className="text-lg font-semibold">Unable to load this page</h1><p role="alert" className="text-sm text-muted-foreground">{error instanceof Error?error.message:'Please try again.'}</p><Button onClick={()=>{void router.invalidate();reset();}}>Retry</Button></div>;
}
export function DataNotFound() { return <p className="py-8 text-sm text-muted-foreground">This report or run is not available to your account.</p>; }