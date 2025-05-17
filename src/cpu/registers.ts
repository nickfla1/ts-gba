export class Registers {
	a = 0;
	b = 0;
	c = 0;
	d = 0;
	e = 0;
	f = 0;
	h = 0;
	l = 0;

	flags = {
		zero: false,
		subtract: false,
		halfCarry: false,
		carry: false,
	};

	pc = 0;
	sp = 0;

	get af(): number {
		return (this.a << 8) | this.getFlagsAsByte();
	}

	set af(value: number) {
		this.a = (value >> 8) & 0xff;
		this.setFlagsFromByte(value & 0xff);
	}

	get bc(): number {
		return (this.b << 8) | (this.c & 0xff);
	}

	set bc(value: number) {
		this.b = (value >> 8) & 0xff;
		this.c = value & 0xff;
	}

	get de(): number {
		return (this.d << 8) | (this.e & 0xff);
	}

	set de(value: number) {
		this.d = (value >> 8) & 0xff;
		this.e = value & 0xff;
	}

	get hl(): number {
		return (this.h << 8) | (this.l & 0xff);
	}

	set hl(value: number) {
		this.h = (value >> 8) & 0xff;
		this.l = value & 0xff;
	}

	private getFlagsAsByte(): number {
		let result = 0;
		if (this.flags.zero) result |= 0x80;
		if (this.flags.subtract) result |= 0x40;
		if (this.flags.halfCarry) result |= 0x20;
		if (this.flags.carry) result |= 0x10;

		return result;
	}

	private setFlagsFromByte(value: number): void {
		this.flags.zero = (value & 0x80) !== 0;
		this.flags.subtract = (value & 0x40) !== 0;
		this.flags.halfCarry = (value & 0x20) !== 0;
		this.flags.carry = (value & 0x10) !== 0;
	}
}
