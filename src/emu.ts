import { CPU } from "./cpu/cpu.ts";
import { MemoryMap } from "./memory/memory.ts";

export class GBA {
	cpu: CPU;
	memory: MemoryMap;

	constructor() {
		this.memory = new MemoryMap();
		this.cpu = new CPU();
	}
}
