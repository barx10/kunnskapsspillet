import type { Poengskala } from './types'

export const poengFor = (rad: number, skala: Poengskala) => (rad + 1) * skala
