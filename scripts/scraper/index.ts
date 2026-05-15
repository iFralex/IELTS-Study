import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { scrapeListening } from './scrape-listening'
import { scrapeReading } from './scrape-reading'
import { scrapeWriting } from './scrape-writing'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main(): Promise<void> {
  const root = path.join(__dirname, '../../data')
  fs.mkdirSync(path.join(root, 'listening'), { recursive: true })
  fs.mkdirSync(path.join(root, 'reading'),   { recursive: true })
  fs.mkdirSync(path.join(root, 'writing'),   { recursive: true })

  console.log('Scraping Listening...')
  const listening = await scrapeListening()
  fs.writeFileSync(path.join(root, 'listening/exercises.json'), JSON.stringify(listening, null, 2))
  console.log(`  ✓ ${listening.length} exercises`)

  console.log('Scraping Reading...')
  const reading = await scrapeReading()
  fs.writeFileSync(path.join(root, 'reading/exercises.json'), JSON.stringify(reading, null, 2))
  console.log(`  ✓ ${reading.length} exercises`)

  console.log('Scraping Writing...')
  const { task1, task2 } = await scrapeWriting()
  fs.writeFileSync(path.join(root, 'writing/task1.json'), JSON.stringify(task1, null, 2))
  fs.writeFileSync(path.join(root, 'writing/task2.json'), JSON.stringify(task2, null, 2))
  console.log(`  ✓ ${task1.length} Task 1, ${task2.length} Task 2`)

  console.log('\nDone! Review data/ before running the app.')
}

main().catch(console.error)
