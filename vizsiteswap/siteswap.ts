import assert from "assert";

function parseBeat(character: string): number {
    if (character >= '0' && character <= '9') {
        return parseInt(character);
    } else if (character >= 'a' && character <= 'z') {
        return character.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    } else {
        throw new Error(`Invalid character: ${character}`);
    }
}

export class FourHandedSiteswap {
    sw_: number[];

    constructor(sw: string) {
        this.sw_ = Array.from(sw).map(parseBeat);


    }

    isValid(){
        if (this.length()===0) return false;
        
        const landing: number[] = [];
        for (let i = 0; i < this.length(); i++) 
            landing.push((this.causes(i)+this.length()) % this.length());
        
        const distinctLanding = new Set(landing);
        return distinctLanding.size === landing.length         
        
    }



    length(): number {
        return this.sw_.length;
    }

    throwAt(idx: number): number {
        return this.sw_[this.mod(idx, this.sw_.length)];
    }

    throwLetterAt(idx: number): string {
        const t = this.throwAt(idx);
        if (t < 10) {
            return ""+t;
        } else {
            return '' + String.fromCharCode(t + 'a'.charCodeAt(0) - 10);
        }
    }

    highestThrow(): number {
        return Math.max(...this.sw_);
    }

    causes(idx: number): number {
        return idx + this.throwAt(idx) - 4;
    }

    causedBy(idx: number): number {
        for (let offset = 2; offset >= -1*this.highestThrow(); offset--) 
            if (this.throwAt(idx+offset) -4 + offset === 0) 
                return idx + offset;
        throw new Error(`No throw causes ${idx}`);
    }

    /** returns number of clubs in right and left hand at start ([right, left]),
     * assuming juggler 0 starts and both jugglers start right handed
     */
    getStartingHands(juggler: number): number[] {
        assert(juggler === 0 || juggler === 1);
        let hands = [1, 1];
        for (let idx = juggler; idx < this.length()*2; idx=idx+2) {
            if (this.causedBy(idx)<0 && this.causes(idx)>=0) 
                hands[idx % 4 < 2?0:1] += 1
            //skip an initial zip
            if (this.causedBy(idx)<0 && this.causes(idx)<0) {
                hands[idx % 4 < 2?0:1] += 1
                hands[idx % 4 < 2?1:0] -= 1
            }
        }
        return hands
    }
  

    throwOriginAt(idx: number): number {
        return this.jugglerAt(idx);
    }

    jugglerAt(idx: number): number {
        return this.mod(idx, 2)
    }

    siteswapString(): string {
        return this.sw_.map((x) => {
            if (x < 10) {
                return x.toString();
            } else {
                return String.fromCharCode(x + 'a'.charCodeAt(0) - 10);
            }
        }).join("");
    }


    mod(va: number, len: number): number {
        let v = va;
        while (v < 0) {
            v += len;
        }
        return v % len;
    }
}