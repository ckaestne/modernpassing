
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

        // check if the sum of the throws is divisible by the length
        if (this.sw_.reduce((a, b) => a + b, 0) % this.sw_.length != 0)
            return false
        
        // check if the throws land on distinct beats and on all beats
        const landing: number[] = [];
        for (let i = 0; i < this.length(); i++) 
            landing.push((this.causes(i)+this.length()) % this.length());
        
        const distinctLanding = new Set(landing);
        return distinctLanding.size === landing.length         
        
    }

    isValidStart() {
        const nrObjects = this.sw_.reduce((a, b) => a + b, 0) / this.sw_.length;
        const hands = this.getStartingHands()
        return nrObjects == hands[0][0] + hands[1][0]+ hands[0][1] + hands[1][1];
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

    /** the beat on which the club thrown on idx was previously thrown
     *  (this is tracking a club as in a ladder diagram, not the throw
     *   that caused this to be thrown)
     */
    thrownPreviously(idx: number): number {
        for (let offset = 0; offset >= -1*this.highestThrow(); offset--) 
            if (this.throwAt(idx+offset) + offset === 0) 
                return idx + offset;
        throw new Error(`No throw causes ${idx}`);
    }

    thrownNext(idx: number): number {
        return idx + this.throwAt(idx);
    }

    numberOfObjects(): number {
        return this.sw_.reduce((a, b) => a + b, 0) / this.sw_.length
    }


    /** returns number of clubs in right and left hand at start for jugglers
     * A and B ([rightA, leftA], [rightB, leftB]),
     * assuming juggler 0 starts and both jugglers start right handed
     */
    getStartingHands(): [number, number][] {
        let hands: [number, number][] = [[0, 0],[0,0]];


        for (let idx = 0; idx < this.numberOfObjects() + this.highestThrow(); idx=idx+1) {
            if (this.thrownPreviously(idx)<0) 
                hands[idx%2][idx % 4 < 2?0:1] += 1
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