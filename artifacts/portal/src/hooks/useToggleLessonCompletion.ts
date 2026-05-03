import { useQueryClient } from "@tanstack/react-query";
import {
  useToggleLessonCompletion as useToggleLessonCompletionMutation,
  getGetLessonQueryKey,
  getGetMyProgressQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useToggleLessonCompletion(lessonId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useToggleLessonCompletionMutation();

  const toggle = (currentLesson: { isCompleted: boolean }) => {
    const newStatus = !currentLesson.isCompleted;
    const lessonQueryKey = getGetLessonQueryKey(lessonId);

    queryClient.setQueryData(lessonQueryKey, {
      ...(queryClient.getQueryData(lessonQueryKey) as object),
      isCompleted: newStatus,
    });

    mutation.mutate(
      { lessonId, data: { completed: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: lessonQueryKey });
          queryClient.invalidateQueries({ queryKey: getGetMyProgressQueryKey() });
          toast({ title: newStatus ? "Lesson completed!" : "Lesson marked incomplete" });
        },
        onError: () => {
          queryClient.setQueryData(lessonQueryKey, {
            ...(queryClient.getQueryData(lessonQueryKey) as object),
            isCompleted: currentLesson.isCompleted,
          });
          toast({ title: "Error updating status", variant: "destructive" });
        },
      }
    );
  };

  return { toggle, isPending: mutation.isPending };
}
