import { useLocation, useParams } from 'react-router-dom';
import Panel from '../components/ui/Panel';
import DataBoundView from '../components/ui/DataBoundView';
import Skeleton from '../components/ui/Skeleton';
import CourseEditor from '../components/studio/CourseEditor';
import CourseList from '../components/studio/CourseList';
import { normalizeLoadedCourse, emptyCourse } from '../components/studio/studioModel';
import useDataState from '../hooks/useDataState';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function EditorSkeleton() {
  return (
    <Panel>
      <Skeleton height={24} width="35%" radius={8} style={{ marginBottom: 22 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <Skeleton height={12} width={120} style={{ marginBottom: 7 }} />
          <Skeleton height={42} width="100%" radius={10} />
        </div>
      ))}
      <Skeleton height={44} width={160} radius={10} />
    </Panel>
  );
}

function ExistingCourseEditor({ courseId }) {
  const state = useDataState(async () => normalizeLoadedCourse(await api.get(`/company/courses/${courseId}`)), [courseId]);
  return (
    <DataBoundView
      state={state}
      loadingLabel="Loading course studio..."
      skeleton={<EditorSkeleton />}
      errorTitle="Could not load this course"
      isEmpty={() => false}
    >
      {(initial) => <CourseEditor key={courseId} courseId={courseId} initial={initial} />}
    </DataBoundView>
  );
}

/**
 * Course Studio, shared by Recruiter and CourseProvider.
 * `/company-courses` lists own courses; `/new` and `/:courseId/edit` open the four-step editor.
 */
export default function CourseManagementPage() {
  const { courseId } = useParams();
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (courseId) return <ExistingCourseEditor courseId={courseId} />;
  if (pathname.endsWith('/new')) return <CourseEditor initial={emptyCourse()} />;
  const eyebrow = user?.role === 'CourseProvider' ? 'Provider studio / curriculum' : 'Employer tools / curriculum';
  return <CourseList eyebrow={eyebrow} />;
}
