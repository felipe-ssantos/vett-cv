import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { Header } from './components/layout/Header'
import { PageContainer } from './components/layout/PageContainer'

function App () {
  return (
    <BrowserRouter>
      <div className='min-h-screen bg-gray-50 flex flex-col'>
        <Header />
        <PageContainer>
          <AppRoutes />
        </PageContainer>
      </div>
    </BrowserRouter>
  )
}

export default App
