import type { Language } from "@/lib/languages";

type FlagCode = Language["flag"];

const starPath =
  "M0-1.6 0.38-.52 1.52-.5.61.18.96 1.3 0 .62-.96 1.3-.61.18-1.52-.02-.38-.52Z";

export function LanguageFlag({ flag }: { flag: FlagCode }) {
  return (
    <svg
      viewBox="0 0 24 18"
      className="size-6 shrink-0 rounded-[3px] ring-1 ring-black/10"
      aria-hidden="true"
      focusable="false"
    >
      {flag === "us" && (
        <>
          <path fill="#fff" d="M0 0h24v18H0z" />
          {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((y) => (
            <path key={y} fill="#b22234" d={`M0 ${y}h24v1H0z`} />
          ))}
          <path fill="#3c3b6e" d="M0 0h10v9H0z" />
          {[1.4, 3.2, 5, 6.8].flatMap((y, row) =>
            [1.4, 3.4, 5.4, 7.4].map((x) => (
              <circle
                key={`${row}-${x}`}
                cx={x + (row % 2 ? 0.7 : 0)}
                cy={y}
                r=".28"
                fill="#fff"
              />
            ))
          )}
        </>
      )}
      {flag === "in" && (
        <>
          <path fill="#ff9933" d="M0 0h24v6H0z" />
          <path fill="#fff" d="M0 6h24v6H0z" />
          <path fill="#138808" d="M0 12h24v6H0z" />
          <circle cx="12" cy="9" r="2.35" fill="none" stroke="#000080" strokeWidth=".45" />
          <circle cx="12" cy="9" r=".4" fill="#000080" />
          {Array.from({ length: 12 }, (_, index) => (
            <path
              key={index}
              d="M12 6.9v4.2"
              stroke="#000080"
              strokeWidth=".22"
              transform={`rotate(${index * 30} 12 9)`}
            />
          ))}
        </>
      )}
      {flag === "sa" && (
        <>
          <path fill="#006c35" d="M0 0h24v18H0z" />
          <path
            d="M5 11.8h14l-1.6 1-10.8-.5"
            fill="#fff"
          />
          <text
            x="12"
            y="8.7"
            fill="#fff"
            fontSize="2.15"
            fontWeight="700"
            textAnchor="middle"
            direction="rtl"
          >
            لا إله إلا الله محمد رسول الله
          </text>
        </>
      )}
      {flag === "ru" && (
        <>
          <path fill="#fff" d="M0 0h24v6H0z" />
          <path fill="#0039a6" d="M0 6h24v6H0z" />
          <path fill="#d52b1e" d="M0 12h24v6H0z" />
        </>
      )}
      {flag === "tr" && (
        <>
          <path fill="#e30a17" d="M0 0h24v18H0z" />
          <circle cx="10" cy="9" r="5" fill="#fff" />
          <circle cx="11.5" cy="8" r="4" fill="#e30a17" />
          <path
            d={starPath}
            fill="#fff"
            transform="translate(16 9) scale(1.7)"
          />
        </>
      )}
      {flag === "pt" && (
        <>
          <path fill="#046a38" d="M0 0h9.6v18H0z" />
          <path fill="#da291c" d="M9.6 0H24v18H9.6z" />
          <circle cx="9.6" cy="9" r="3" fill="#ffcd00" />
          <circle cx="9.6" cy="9" r="1.7" fill="#da291c" />
        </>
      )}
      {flag === "cn" && (
        <>
          <path fill="#de2910" d="M0 0h24v18H0z" />
          <path d={starPath} fill="#ffde00" transform="translate(5 4) scale(2.4)" />
          {[0, 1, 2, 3].map((index) => (
            <path
              key={index}
              d={starPath}
              fill="#ffde00"
              transform={`translate(${9 + (index % 2) * 2.4} ${2.5 + Math.floor(index / 2) * 2.1}) scale(.9)`}
            />
          ))}
        </>
      )}
      {flag === "jp" && (
        <>
          <path fill="#fff" d="M0 0h24v18H0z" />
          <circle cx="12" cy="9" r="5.1" fill="#bc002d" />
        </>
      )}
    </svg>
  );
}
