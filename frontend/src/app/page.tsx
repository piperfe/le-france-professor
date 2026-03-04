import { StartButton } from '../components/start-button'

export default function WelcomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Le France Professor</h1>
      <p className="text-lg text-gray-600">
        Commencez une conversation pour apprendre le français !
      </p>
      <StartButton />
    </main>
  )
}
