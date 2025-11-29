import { supportedMovement, supportedShapes, type TLayout, type TMovementStep, loadPathsFromSvg, TShape, TMovement } from "@modernpassing/layout";
import assert from "node:assert";
import { type Role } from "@modernpassing/pattern";

export function parseLayout(input: string): TLayout {
    // simple parser
    // assert single pair of parentheses
    assert(input.indexOf('(') >= 0 && input.indexOf(')') > input.indexOf('('), "expecting a single pair of parentheses")
    //remove whitespace
    input = input.replace(/\s/g, "")

    //split at commas and parentheses
    const parts = input.split(/[\(\),]/).filter(p => p.length > 0)

    assert(supportedShapes.includes(parts[0]), `shape ${parts[0]} not currently supported`)

    if (parts[0] === 'Free') {
        //free layout
        const pos = parts.slice(1)
        assert(pos.length % 3 === 0, "free layout must have 3 entries per role (role, x, y)")
        const r: [Role, number, number][] = []
        for (let i = 0; i < pos.length; i += 3) {
            const x = Number(pos[i + 1]);
            const y = Number(pos[i + 2]);
            const role = pos[i]
            assert(!isNaN(x) && x >= 0 && x <= 1, "x coordinate must be a number between 0 and 1");
            assert(!isNaN(y) && y >= 0 && y <= 1, "y coordinate must be a number between 0 and 1");
            assert(/^[A-Z]$/.test(role), "role names must be single uppercase letters")
            r.push([role, x, y]);
        }

        return { type: 'free', pos: r }
    } else if (parts[0] === 'Svg') {
        const svgFile = 'src/'+parts[1]
        assert(svgFile.endsWith('.svg'), "svg file must end with .svg")
        assert(Deno.statSync(svgFile).isFile, `svg file ${svgFile} not found in src/`)
        assert((parts.length % 2 === 0) && (parts.length >= 4), "svg must have pairs of role name and path index for each role")

        const segments = loadPathsFromSvg(svgFile)
        const roles: [Role, number][] = []
        for (let i = 2; i < parts.length; i += 2) {
            const role = parts[i]
            const idx = Number(parts[i + 1])
            assert(!isNaN(idx) && idx >= 0 && idx < segments.length, `path index must be a number between 0 and number of path segments (${segments.length}), but found ${idx}`)
            assert(/^[A-Z]$/.test(role), `role names must be single uppercase letters, but found ${role}`)
            roles.push([role, idx])
        }

        return {
            type: 'svg', segments, roles
        }

    } else {
        //standard layout
        const shape = parts[0] as TShape
        const i = parts.findLastIndex((p, idx) => idx > 0 && /^[A-Z_]$/.test(p)) + 1
        const roles: Role[] = parts.slice(1, i)
        const args: number[] = parts.slice(i).map(p => {
            const num = Number(p)
            assert(!isNaN(num), `argument must be a number, but found ${p}`)
            return num
        })
        
        assert(roles.length > 0, "at least one role must be specified")
        return { type: 'standard', shape, roles, args }
    }

}

export function parseMovements(input: string[], roles: Role[]): TMovement {
    if (input.length === 0) return []
    const allInputs = input.join('')
    //split after closing parenthesis
    const parts = allInputs.split(')').filter(p => p.trim().length > 0).map(s => s + ')')
    return parts.map((p)=>parseMovement(p, roles)).flat()
}

function parseMovement(input: string, roles: Role[]): TMovementStep[] {
    // simple parser
    // assert single pair of parentheses
    assert(input.indexOf('(') >= 0 && input.indexOf(')') > input.indexOf('('), `expecting a single pair of parentheses in ${input}`)
    //remove whitespace
    input = input.replace(/\s/g, "")

    //split at commas and parentheses
    const parts = input.split(/[\(\),]/).filter(p => p.length > 0)

    assert(supportedMovement.includes(parts[0]), `movement ${parts[0]} not currently supported`)

    //standard layout
    const type = parts[0]
    const role = parts[1]
    const when = Number(parts[2])
    const duration = Number(parts[3])
    assert(/^[A-Z\*]$/.test(role), "role names must be single uppercase letters or the wildcard * for all roles")
    assert(!isNaN(when), "when must be a number")
    assert(!isNaN(duration), "duration must be a number")
    assert(parts.slice(4).every(p => !isNaN(Number(p))), "extra parameters must be numbers")

    const extraParam = parts.slice(4).map(p => Number(p))
    // * gets replaced by all roles
    if (role === '*') 
        return roles.map(r => ({ type, role: r, when, duration, extraParam })) 
    return [{ type, role, when, duration, extraParam }]
}
