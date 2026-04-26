'use client';
import { useActionState } from 'react';

export function ActionForm({ 
  action, 
  children, 
  className,
  formRef
}: { 
  action: (formData: FormData) => Promise<any>, 
  children: React.ReactNode, 
  className?: string,
  formRef?: React.RefObject<HTMLFormElement | null>
}) {
   const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
       try {
           const result = await action(formData);
           if (result && typeof result === 'object' && result.error) {
               return { error: result.error };
           }
           return { success: true };
       } catch (err: any) {
           return { error: err.message || "System error" };
       }
   }, null);

   return (
       <form action={formAction} className={className} ref={formRef}>
           {children}
           {state?.error && (
               <p className="text-red-500 text-sm mt-2 font-medium">{state.error}</p>
           )}
       </form>
   );
}
