import { memo, useLayoutEffect } from 'react'
import {
  createHashRouter,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  useRouteError,
  RouteObject,
} from 'react-router-dom'
import { MainLayout } from 'src/components/layout/MainLayout'
import { APP_ROUTES, getRouteURL } from 'src/utils/routes'
import { logDebug, logError } from 'src//utils/logger'
import { DefaultError } from 'src/components/atoms/DefaultError'
import { DefaultLoader } from './components/atoms/DefaultLoader'
import { ROUTE_MODE } from 'src/constants/route'

import SessionPage from 'src/pages/SessionPage'
import CreateSessionPage from 'src/pages/CreateSessionPage'
import SessionListPage from 'src/pages/SessionListPage'
import DocumentPage from 'src/pages/DocumentPage'
import { withSessionHOC } from './components/layout/WithSessionHOC'

function ErrorBoundary() {
  const error = useRouteError()
  logError('Route Error Boundary', error)
  return <DefaultError />
}

const routes = createRoutesFromElements(
  <Route errorElement={<ErrorBoundary />}>
    <Route element={<MainLayout />}>
      <Route
        path={APP_ROUTES.session}
        Component={withSessionHOC(SessionPage)}
        errorElement={<ErrorBoundary />}
      />
      <Route
        path={APP_ROUTES.sessions}
        Component={SessionListPage}
        errorElement={<ErrorBoundary />}
      />
      <Route
        path={APP_ROUTES.createSession}
        Component={CreateSessionPage}
        errorElement={<ErrorBoundary />}
      />
      <Route path={APP_ROUTES.document} errorElement={<ErrorBoundary />} Component={DocumentPage} />
      <Route path="*" element={<Navigate to={getRouteURL('sessions')} />} />
    </Route>
  </Route>,
)

const getRouter = (routes: RouteObject[], opts?: { basename?: string }) => {
  switch (ROUTE_MODE) {
    case 'browser':
      return createBrowserRouter(routes, opts)
    case 'hash':
      return createHashRouter(routes)
    default:
      return createBrowserRouter(routes, opts)
  }
}
const router = getRouter(routes, { basename: import.meta.env.VITE_BASE_URL })

logDebug('[BASE_URL]', import.meta.env.VITE_BASE_URL)
const AppRoute = memo(
  () => {
    const invalidBaseURL = !window.location.pathname.includes(import.meta.env.VITE_BASE_URL)
    useLayoutEffect(() => {
      if (invalidBaseURL) {
        window.location.href = `${import.meta.env.VITE_BASE_URL}`.replace('//', '/')
      }
    }, [invalidBaseURL])

    if (invalidBaseURL) {
      return <DefaultLoader className="w-screen h-screen" morphing />
    }

    return <RouterProvider router={router} />
  },
  () => true,
)

export default AppRoute
