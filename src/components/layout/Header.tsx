import { Link } from 'react-router-dom'

export function Header () {
  return (
    <header className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center'>
        <Link to='/' className='font-titulo text-xl font-bold text-blue-600'>
          Job Fit Analyzer
        </Link>
        <Link
          to='/vagas/nova'
          className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors'
        >
          Nova Vaga
        </Link>
      </div>
    </header>
  )
}
