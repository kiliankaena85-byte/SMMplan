'use client';
import { useActionState } from 'react';

export function ActionForm({ 
  action, 
  children, 
  className,
  formRef
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>, 
  children: React.ReactNode | ((props: { isPending: boolean }) => React.ReactNode),
  className?: string,
  formRef?: React.RefObject<HTMLFormElement | null>
}) {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
       try {
           const result = await action(formData);
           if (result && typeof result === 'object' && result.error) {
               return { error: result.error };
           }
           return { success: true };
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       } catch (err: any) {
           return { error: err.message || "System error" };
       }
   }, null);

   return (
       <form action={formAction} className={className} ref={formRef}>
           <fieldset disabled={isPending} className="contents">
             {typeof children === 'function' ? children({ isPending }) : children}
           </fieldset>
           {state?.error && (
               <p className="text-destructive text-sm mt-2 font-medium" role="alert" aria-live="assertive">{state.error}</p>
           )}
       </form>
   );
}
