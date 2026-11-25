import { check, count, error, readProjectFile, text, verdict, z } from '@cairul/pdk';

const impact = z.enum(['minor', 'moderate', 'serious', 'critical']);
const reportSchema = z.object({
  violations: z.array(z.object({ impact: impact.nullable() })),
  passes: z.array(z.unknown()),
  incomplete: z.array(z.unknown()),
});

export default function axe() {
  return {
    checkKinds: {
      'axe.violations': check(
        z.strictObject({
          report: text,
          impacts: z.array(impact).min(1).default(impact.options),
          maximum: count.default(0),
        }),
        async ({ report, impacts, maximum }, { projectDir, signal }) => {
          try {
            const { violations, passes, incomplete } = reportSchema.parse(
              JSON.parse(await readProjectFile(projectDir, report, signal))
            );
            if (!passes.length && !violations.length && !incomplete.length)
              return verdict(false, 'No accessibility rules were evaluated.');
            const found = violations.filter(({ impact }) => impact === null || impacts.includes(impact)).length;
            return verdict(found <= maximum, `${found} accessibility violations; limit ${maximum}.`);
          } catch (cause) {
            return cause?.code === 'ENOENT'
              ? verdict(false, 'Waiting for axe report.')
              : error('axe report is unreadable or invalid.');
          }
        }
      ),
    },
  };
}
