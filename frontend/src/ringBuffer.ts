const SIZE = 4096

// Fixed-size sample store. `total` counts every sample ever pushed, so
// readers address samples by absolute index and never copy.
export class RingBuffer {
  private data = new Float32Array(SIZE)
  total = 0

  push(samples: number[]) {
    for (const s of samples) this.data[this.total++ % SIZE] = s
  }

  at(index: number) {
    return this.data[index % SIZE]
  }
}

export type WaveChannel = 'ecg' | 'ppg' | 'resp'
export type WaveBuffers = Record<WaveChannel, RingBuffer>

export const createWaveBuffers = (): WaveBuffers => ({
  ecg: new RingBuffer(),
  ppg: new RingBuffer(),
  resp: new RingBuffer(),
})
