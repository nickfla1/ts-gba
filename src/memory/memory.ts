export interface Memory {
	read(addr: number): number;
	write(addr: number, value: number): void;
	readWord(addr: number): number;
	writeWord(addr: number, value: number): void;
}

interface MBC {
	read(addr: number): number;
	write(addr: number, value: number): void;
	readRAM(addr: number, bank: number): number;
	writeRAM(addr: number, bank: number, value: number): void;
}

export class MemoryMap implements Memory {
	private rom: Uint8Array = new Uint8Array(0x8000);
	private vram: Uint8Array = new Uint8Array(0x2000);
	private extRam: Uint8Array = new Uint8Array(0x2000);
	private wram: Uint8Array = new Uint8Array(0x2000);
	private oam: Uint8Array = new Uint8Array(0x100);
	private io: Uint8Array = new Uint8Array(0x80);
	private hram: Uint8Array = new Uint8Array(0x7f);
	private ieRegister = 0;

	private mbc: MBC | null = null;
	private romBank = 1;
	private ramBank = 0;
	private ramEnabled = false;

	constructor() {
		this.reset();
	}

	reset(): void {
		this.rom.fill(0);
		this.vram.fill(0);
		this.extRam.fill(0);
		this.wram.fill(0);
		this.oam.fill(0);
		this.io.fill(0);
		this.hram.fill(0);
		this.ieRegister = 0;

		this.romBank = 1;
		this.ramBank = 0;
		this.ramEnabled = false;

		// Initialize I/O registers with their boot values
		this.io[0x05] = 0x00; // TIMA
		this.io[0x06] = 0x00; // TMA
		this.io[0x07] = 0x00; // TAC
		this.io[0x10] = 0x80; // NR10
		this.io[0x11] = 0xbf; // NR11
		this.io[0x12] = 0xf3; // NR12
		this.io[0x14] = 0xbf; // NR14
		this.io[0x16] = 0x3f; // NR21
		this.io[0x17] = 0x00; // NR22
		this.io[0x19] = 0xbf; // NR24
		this.io[0x1a] = 0x7f; // NR30
		this.io[0x1b] = 0xff; // NR31
		this.io[0x1c] = 0x9f; // NR32
		this.io[0x1e] = 0xbf; // NR33
		this.io[0x20] = 0xff; // NR41
		this.io[0x21] = 0x00; // NR42
		this.io[0x22] = 0x00; // NR43
		this.io[0x23] = 0xbf; // NR44
		this.io[0x24] = 0x77; // NR50
		this.io[0x25] = 0xf3; // NR51
		this.io[0x26] = 0xf1; // NR52
		this.io[0x40] = 0x91; // LCDC
		this.io[0x42] = 0x00; // SCY
		this.io[0x43] = 0x00; // SCX
		this.io[0x45] = 0x00; // LYC
		this.io[0x47] = 0xfc; // BGP
		this.io[0x48] = 0xff; // OBP0
		this.io[0x49] = 0xff; // OBP1
		this.io[0x4a] = 0x00; // WY
		this.io[0x4b] = 0x00; // WX
		this.io[0xff] = 0x00; // IE
	}

	loadROM(data: Uint8Array, type: number): void {
		const romSize = Math.min(data.length, this.rom.length);
		for (let i = 0; i < romSize; i++) {
			this.rom[i] = data[i];
		}

		switch (type) {
			case 0x00: // ROM only
				this.mbc = new MBC0(this.rom);
				break;
			case 0x01: // MBC1
			case 0x02: // MBC1 + RAM
			case 0x03: // MBC1 + RAM + BATTERY
				this.mbc = new MBC1(this.rom);
				break;
			case 0x05: // MBC2
			case 0x06: // MBC2 + BATTERY
				this.mbc = new MBC2(this.rom);
				break;
			case 0x0f: // MBC3 + TIMER + BATTERY
			case 0x10: // MBC3 + TIMER + RAM + BATTERY
			case 0x11: // MBC3
			case 0x12: // MBC3 + RAM
			case 0x13: // MBC3 + RAM + BATTERY
				this.mbc = new MBC3(this.rom);
				break;
			case 0x19: // MBC5
			case 0x1a: // MBC5 + RAM
			case 0x1b: // MBC5 + RAM + BATTERY
			case 0x1c: // MBC5 + RUMBLE
			case 0x1d: // MBC5 + RUMBLE + RAM
			case 0x1e: // MBC5 + RUMBLE + RAM + BATTERY
				this.mbc = new MBC5(this.rom);
				break;
			default:
				console.warn(`unsupported cartridge type ${type.toString(16)}`);
				this.mbc = new MBC0(this.rom);
				break;
		}
	}

	read(addr: number): number {
		throw new Error("Method not implemented.");
	}
	write(addr: number, value: number): void {
		throw new Error("Method not implemented.");
	}
	readWord(addr: number): number {
		throw new Error("Method not implemented.");
	}
	writeWord(addr: number, value: number): void {
		throw new Error("Method not implemented.");
	}
}

class MBC0 implements MBC {
	private rom: Uint8Array;
	private ram: Uint8Array = new Uint8Array(0x2000);

	constructor(rom: Uint8Array) {
		this.rom = rom;
	}

	read(addr: number): number {
		if (addr < 0x8000) {
			return this.rom[addr];
		}

		return 0xff;
	}

	write(_addr: number, _value: number): void {
		// ROM ONLY
	}

	readRAM(addr: number, _bank: number): number {
		return this.ram[addr];
	}

	writeRAM(addr: number, _bank: number, value: number): void {
		this.ram[addr] = value;
	}
}

class MBC1 implements MBC {
	private rom: Uint8Array;
	private ram: Uint8Array = new Uint8Array(0x2000);

	private romBankNumber = 1;
	private ramBankNumber = 0;
	private ramEnabled = false;
	private bakingMode = 0;

	constructor(rom: Uint8Array) {
		this.rom = rom;
	}

	read(addr: number): number {
		if (addr < 0x4000) {
			return this.rom[addr];
		}
		if (addr < 0x8000) {
			const effectiveBankNumber =
				this.romBankNumber === 0 ? 1 : this.romBankNumber;

			const offset = addr - 0x4000;
			const bankAddr = effectiveBankNumber * 0x4000 + offset;

			if (bankAddr < this.rom.length) {
				return this.rom[bankAddr];
			}
		}

		return 0xff;
	}

	write(addr: number, value: number): void {
		if (addr < 0x2000) {
			this.ramEnabled = (value & 0x0f) === 0x0a;
		} else if (addr < 0x4000) {
			this.romBankNumber = (this.romBankNumber & 0x60) | (value & 0x1f);
			if ((this.romBankNumber & 0x1f) === 0) {
				this.romBankNumber += 1;
			}
		} else if (addr < 0x6000) {
			if (this.bakingMode === 0) {
				this.romBankNumber =
					(this.romBankNumber & 0x1f) | ((value & 0x03) << 5);
			} else {
				this.romBankNumber = value & 0x03;
			}
		} else if (addr < 0x8000) {
			this.bakingMode = value & 0x01;
			if (this.bakingMode === 1) {
				this.romBankNumber &= 0x1f;
			}
		}
	}

	readRAM(addr: number, _bank: number): number {
		if (!this.ramEnabled) {
			return 0xff;
		}

		const effectiveBankNumber = this.bakingMode === 1 ? this.ramBankNumber : 0;
		const ramAddr = effectiveBankNumber * 0x2000 + addr;

		if (ramAddr < this.ram.length) {
			return this.ram[ramAddr];
		}

		return 0xff;
	}

	writeRAM(addr: number, _bank: number, value: number): void {
		if (!this.ramEnabled) {
			return;
		}

		const effectiveBankNumber = this.bakingMode === 1 ? this.ramBankNumber : 0;
		const ramAddr = effectiveBankNumber * 0x2000 + addr;

		if (ramAddr < this.ram.length) {
			this.ram[ramAddr] = value;
		}
	}
}
