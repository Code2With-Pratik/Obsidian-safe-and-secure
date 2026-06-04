"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  AtSign,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  MapPin,
  Globe,
  Github,
  Twitter,
  Music
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NovaMascot } from "@/components/nova-mascot";
import { useAuthStore } from "@/store/use-auth-store";
import { cn, initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { updateProfile, uploadFile } from "@/lib/supabase/actions";
import { useToast } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

const BANNER_PRESETS = [
  "linear-gradient(135deg, #8B5CF6, #EC4899, #22D3EE)",
  "linear-gradient(135deg, #22D3EE, #3B82F6, #A78BFA)",
  "linear-gradient(135deg, #FBBF24, #F472B6, #A78BFA)",
  "linear-gradient(135deg, #10B981, #22D3EE, #8B5CF6)",
  "linear-gradient(135deg, #F43F5E, #FB923C, #FBBF24)",
  "linear-gradient(135deg, #6366F1, #D946EF)",
  "linear-gradient(135deg, #06B6D4, #6366F1)",
  "linear-gradient(135deg, #A3E635, #14B8A6, #06B6D4)",
  "linear-gradient(135deg, #7C3AED, #DB2777)",
  "linear-gradient(135deg, #F97316, #E11D48)",
  "linear-gradient(135deg, #0F172A, #4338CA, #7C3AED)",
  "linear-gradient(135deg, #0EA5E9, #2563EB, #4338CA)"
];

const PRONOUN_PRESETS = ["she/her", "he/him", "they/them", "she/they", "he/they"];

const TOTAL_STEPS = 3;
type StepNum = 1 | 2 | 3;

const STEP_SUBTITLES: Record<StepNum, string> = {
  1: "Banner and avatar.",
  2: "Identity and profession.",
  3: "Bio and links."
};

const STEPS: { n: StepNum; label: string }[] = [
  { n: 1, label: "Banner" },
  { n: 2, label: "Identity" },
  { n: 3, label: "About" }
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = React.useState<StepNum>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);

  // Tracks slide direction so the next/back animation animates the right way.
  const dirRef = React.useRef<1 | -1>(1);
  const goNext = () => {
    dirRef.current = 1;
    setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as StepNum) : s));
  };
  const goBack = () => {
    dirRef.current = -1;
    setStep((s) => (s > 1 ? ((s - 1) as StepNum) : s));
  };
  // Clicking a step in the stepper jumps straight to it (forwards or back).
  const goTo = (target: StepNum) => {
    if (target === step) return;
    dirRef.current = target > step ? 1 : -1;
    setStep(target);
  };

  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [pronouns, setPronouns] = React.useState(user?.pronouns ?? "");
  const [profession, setProfession] = React.useState(user?.profession ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [location, setLocation] = React.useState(user?.location ?? "");
  const [website, setWebsite] = React.useState(user?.links?.website ?? "");
  const [github, setGithub] = React.useState(user?.links?.github ?? "");
  const [twitter, setTwitter] = React.useState(user?.links?.twitter ?? "");
  const [spotify, setSpotify] = React.useState(user?.links?.spotify ?? "");
  const [avatar, setAvatar] = React.useState(user?.avatar ?? "");
  const [banner, setBanner] = React.useState(user?.banner ?? BANNER_PRESETS[0]);

  // Reset wizard + load fresh user data each time the dialog opens.
  React.useEffect(() => {
    if (open && user) {
      setStep(1);
      dirRef.current = 1;
      setName(user.name);
      setUsername(user.username);
      setPronouns(user.pronouns ?? "");
      setProfession(user.profession ?? "");
      setBio(user.bio ?? "");
      setLocation(user.location ?? "");
      setWebsite(user.links?.website ?? "");
      setGithub(user.links?.github ?? "");
      setTwitter(user.links?.twitter ?? "");
      setSpotify(user.links?.spotify ?? "");
      setAvatar(user.avatar);
      setBanner(user.banner ?? BANNER_PRESETS[0]);
    }
  }, [open, user]);

  const handleSave = async () => {
    setSubmitting(true);
    const profileData = {
      name: name.trim() || user?.name || "New User",
      username: username.trim().replace(/^@+/, "") || user?.username || "user",
      pronouns: pronouns.trim(),
      profession: profession.trim(),
      bio: bio.trim(),
      location: location.trim(),
      links: {
        website: website.trim() || undefined,
        github: github.trim().replace(/^@+/, "") || undefined,
        twitter: twitter.trim().replace(/^@+/, "") || undefined,
        spotify: spotify.trim() || undefined
      },
      avatar: avatar.trim(),
      banner
    };

    const result = await updateProfile(profileData);
    setSubmitting(false);

    if (result.error) {
      toast({
        title: "Update Failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    updateUser(profileData);
    toast({ title: "Profile updated successfully!" });
    onOpenChange(false);
  };

  // File pickers — now uploading to Supabase Storage
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const onBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingBanner(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'stories'); // Use stories bucket for now or dedicated one
    formData.append('path', `${user.id}/banner-${Date.now()}`);

    const result = await uploadFile(formData);
    setUploadingBanner(false);

    if (result.publicUrl) {
      setBanner(result.publicUrl);
    } else {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
    }
    e.target.value = "";
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'avatars');
    formData.append('path', `${user.id}/avatar-${Date.now()}`);

    const result = await uploadFile(formData);
    setUploadingAvatar(false);

    if (result.publicUrl) {
      setAvatar(result.publicUrl);
      toast({ title: "Avatar uploaded — click Save to apply." });
    } else {
      // The `avatars` Storage bucket is the most common reason this
      // fails on a fresh project — section 22 of APPLY_PENDING.sql
      // creates it. Surface the cause directly instead of a generic
      // toast so the user knows to apply the SQL.
      const detail = result.error?.toLowerCase().includes("bucket")
        ? `${result.error} — apply section 22 of supabase/APPLY_PENDING.sql to create the "avatars" bucket.`
        : result.error;
      toast({ title: "Upload failed", description: detail, variant: "destructive" });
    }
    e.target.value = "";
  };

  // Banner type detection — used both for the live preview and for keeping
  // the URL input usable while the user types (gradients/data URLs stay hidden).
  const isHttpBanner = banner.startsWith("http");
  const isDataImage = banner.startsWith("data:image");
  const isDataVideo = banner.startsWith("data:video");
  const isImageBanner = isHttpBanner || isDataImage;
  const isGradientBanner =
    banner.startsWith("linear-gradient") || banner.startsWith("radial-gradient");
  const bannerInputValue = isGradientBanner || banner.startsWith("data:") ? "" : banner;

  // Slide direction for the step transition.
  const variants = {
    enter: (dir: number) => ({ x: 24 * dir, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: -24 * dir, opacity: 0 })
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fixed dialog size: header + footer pinned, step content fills the
          middle and scrolls internally so the popup never resizes between
          steps regardless of which fields are shown. The
          `w-[calc(100vw_-_2rem)]` keeps a 16px gutter on small viewports so
          the dialog never clips against the screen edge.
          `overflow-visible` lets the NovaMascot peek above the top edge. */}
      {/* Transparent themed bg over the glass blur: `bg-background/50` resolves
          to white/50 in light theme and dark/50 in dark theme via the
          `--background` token. `!` forces it over `.glass`'s own bg. */}
      <DialogContent className="w-[calc(100vw_-_2rem)] max-w-xl p-0 overflow-visible !bg-background/50">
        {/* Mascot perched half-in, half-out at the top centre. The positioning
            math lives on the wrapper, not the mascot itself: framer-motion
            writes inline `transform` on NovaMascot for its idle animations,
            which would otherwise clobber Tailwind's `-translate-*` classes. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-xl pointer-events-none"
          aria-hidden
        >
          <NovaMascot size={84} />
        </div>
        <div className="relative flex flex-col h-[75vh] max-h-[660px] overflow-hidden rounded-2xl">
          {/* `pt-10` pulls the title up tight under the mascot's halo — the
              face sits well above this line so only the soft bottom edge of
              the mascot's glow overlaps the title area. */}
          <div className="px-6 pt-10 pb-2 shrink-0">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label={t("Back")}
                    className="size-8 -ml-1 shrink-0 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}
                <div className="flex-1 text-left">
                  <DialogTitle className="text-2xl font-display">{t("Edit profile")}</DialogTitle>
                  <DialogDescription className="text-sm text-foreground/70">
                    {t(STEP_SUBTITLES[step])}
                  </DialogDescription>
                </div>
              </div>

              {/* Clickable numbered stepper. Smaller circles, tighter top
                  margin so the step content sits higher in the dialog. */}
              <div className="mt-2 grid grid-cols-3">
                {STEPS.map((s, idx) => {
                  const isActive = step === s.n;
                  const isDone = step > s.n;
                  const lineLeftActive = step >= s.n;
                  const lineRightActive = step > s.n;
                  return (
                    <div key={s.n} className="relative flex flex-col items-center text-center">
                      {idx > 0 && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 right-1/2 top-[10px] h-[2px] -translate-y-1/2 transition-colors",
                            lineLeftActive
                              ? "bg-gradient-to-r from-violet-400 to-cyan-400"
                              : "bg-foreground/15"
                          )}
                        />
                      )}
                      {idx < STEPS.length - 1 && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-1/2 right-0 top-[10px] h-[2px] -translate-y-1/2 transition-colors",
                            lineRightActive
                              ? "bg-gradient-to-r from-violet-400 to-cyan-400"
                              : "bg-foreground/15"
                          )}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => goTo(s.n)}
                        aria-label={`${t("Step")} ${s.n}: ${t(s.label)}`}
                        aria-current={isActive ? "step" : undefined}
                        className={cn(
                          // `leading-none tabular-nums` removes the line-height
                          // and digit-width inconsistency that was nudging the
                          // numbers off-centre inside the small circle.
                          "relative z-10 size-5 rounded-full grid place-items-center text-[10px] font-semibold leading-none tabular-nums transition",
                          isActive &&
                            "bg-gradient-to-br from-violet-400 to-cyan-400 text-white shadow-[0_0_14px_-2px_rgba(139,92,246,0.55)]",
                          isDone && "bg-emerald-500 text-white",
                          !isActive && !isDone &&
                            "bg-foreground/10 text-muted-foreground hover:bg-foreground/20 hover:text-foreground"
                        )}
                      >
                        {isDone ? <Check className="size-3" /> : s.n}
                      </button>
                      <span
                        className={cn(
                          "mt-1 text-[10px] uppercase tracking-wider transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {t(s.label)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DialogHeader>
          </div>

          {/* Step content area — flex-1 fills the gap, and overflow-y-auto
              keeps any individually tall step (e.g. step 3 with the links
              stack) scrollable WITHOUT changing the dialog's outer size. */}
          <div className="flex-1 overflow-y-auto relative">
            <AnimatePresence mode="wait" initial={false} custom={dirRef.current}>
              <motion.div
                key={step}
                custom={dirRef.current}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pb-20"
              >
                {step === 1 && (
                  <Step1Banner
                    t={t}
                    banner={banner}
                    setBanner={setBanner}
                    bannerInputValue={bannerInputValue}
                    isImageBanner={isImageBanner}
                    isDataVideo={isDataVideo}
                    bannerInputRef={bannerInputRef}
                    onBannerFile={onBannerFile}
                    avatar={avatar}
                    setAvatar={setAvatar}
                    name={name}
                    avatarInputRef={avatarInputRef}
                    onAvatarFile={onAvatarFile}
                    uploadingAvatar={uploadingAvatar}
                    uploadingBanner={uploadingBanner}
                  />
                )}

                {step === 2 && (
                  <Step2Identity
                    t={t}
                    name={name}
                    setName={setName}
                    username={username}
                    setUsername={setUsername}
                    pronouns={pronouns}
                    setPronouns={setPronouns}
                    location={location}
                    setLocation={setLocation}
                    profession={profession}
                    setProfession={setProfession}
                  />
                )}

                {step === 3 && (
                  <Step3About
                    t={t}
                    bio={bio}
                    setBio={setBio}
                    website={website}
                    setWebsite={setWebsite}
                    github={github}
                    setGithub={setGithub}
                    twitter={twitter}
                    setTwitter={setTwitter}
                    spotify={spotify}
                    setSpotify={setSpotify}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Buttons float absolutely at bottom-right so the step content
              (and the avatar) can fill the dialog all the way down without
              being clipped by a separate footer bg layer. The content above
              gets `pb-20` so its last item never sits under the buttons. */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <Button variant="glass" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            {step < TOTAL_STEPS ? (
              <Button variant="gradient" onClick={goNext}>
                {t("Next")}
                <ChevronRight />
              </Button>
            ) : (
              <Button variant="gradient" onClick={handleSave} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
                {t("Save changes")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Step 1 — Banner + Avatar ───────────────────── */
function Step1Banner(props: {
  t: ReturnType<typeof useT>;
  banner: string;
  setBanner: (v: string) => void;
  bannerInputValue: string;
  isImageBanner: boolean;
  isDataVideo: boolean;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  onBannerFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  avatar: string;
  setAvatar: (v: string) => void;
  name: string;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingAvatar?: boolean;
  uploadingBanner?: boolean;
}) {
  const {
    t,
    banner,
    setBanner,
    bannerInputValue,
    isImageBanner,
    isDataVideo,
    bannerInputRef,
    onBannerFile,
    avatar,
    setAvatar,
    name,
    avatarInputRef,
    onAvatarFile,
    uploadingAvatar,
    uploadingBanner
  } = props;

  return (
    <>
      <div className="px-6 pt-1">
        <Label className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Banner")}
        </Label>
        <div
          className="relative h-32 mt-2 rounded-2xl overflow-hidden border border-border/60"
          style={
            isImageBanner
              ? {
                  backgroundImage: `url(${banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }
              : isDataVideo
                ? undefined
                : { background: banner }
          }
        >
          {isDataVideo && (
            <video
              src={banner}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {uploadingBanner && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm grid place-items-center z-10">
              <Loader2 className="animate-spin text-white" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-[10px] text-white hover:bg-black/60 transition disabled:opacity-50"
          >
            <ImageIcon className="size-3" /> {t("Upload")}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onBannerFile}
          />
        </div>
        <div className="flex items-center gap-2 mt-5 py-2 px-1 overflow-x-auto no-scrollbar">
          {BANNER_PRESETS.map((g) => (
            <button
              key={g}
              onClick={() => setBanner(g)}
              className={cn(
                "relative shrink-0 size-10 rounded-xl border border-white/20 transition",
                banner === g && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              )}
              style={{ background: g }}
              aria-label="Banner preset"
            >
              {banner === g && (
                <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <Input
          value={bannerInputValue}
          onChange={(e) => setBanner(e.target.value)}
          placeholder={t("…or paste an image URL")}
          className="mt-3"
        />
      </div>

      <div className="px-6 mt-4">
        <Label className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Avatar")}
        </Label>
        <div className="flex items-center gap-4 mt-2 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="size-28 ring-2 ring-background shadow-floating">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-2xl">{initials(name || "New User")}</AvatarFallback>
            </Avatar>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-sm grid place-items-center z-10">
                <Loader2 className="animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label={t("Upload avatar")}
              className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary grid place-items-center shadow-glow ring-2 ring-background hover:scale-105 transition disabled:opacity-50"
            >
              <Camera className="size-4 text-primary-foreground" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFile}
            />
          </div>
          {/* `min-w-0` lets the Input shrink below its content's intrinsic
              width — otherwise long avatar URLs push the row (and the
              dialog) wider than max-w-xl. */}
          <Input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder={t("Avatar image URL")}
            className="flex-1 min-w-0 text-sm"
          />
        </div>
      </div>
    </>
  );
}

/* ───────── Step 2 — Identity (name, username, pronouns, location, profession) ───────── */
function Step2Identity(props: {
  t: ReturnType<typeof useT>;
  name: string;
  setName: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  pronouns: string;
  setPronouns: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  profession: string;
  setProfession: (v: string) => void;
}) {
  const {
    t,
    name,
    setName,
    username,
    setUsername,
    pronouns,
    setPronouns,
    location,
    setLocation,
    profession,
    setProfession
  } = props;
  return (
    <>
      <div className="px-6 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ep-name" className="text-sm uppercase tracking-wider text-foreground/70">
            {t("Name")}
          </Label>
          <Input
            id="ep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Your display name")}
            className="mt-2"
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="ep-username" className="text-sm uppercase tracking-wider text-foreground/70">
            {t("Username")}
          </Label>
          <div className="relative mt-2">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              id="ep-username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())
              }
              placeholder={t("handle")}
              className="pl-8"
              maxLength={24}
            />
          </div>
        </div>
      </div>

      <div className="px-6 mt-5">
        <Label className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Pronouns")}
        </Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PRONOUN_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPronouns(p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition",
                pronouns === p
                  ? "bg-foreground text-background"
                  : "glass-subtle text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <Input
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          placeholder={t("Or write your own (e.g. xe/xem)")}
          className="mt-2 text-sm"
          maxLength={20}
        />
      </div>

      <div className="px-6 mt-5">
        <Label htmlFor="ep-location" className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Location")}
        </Label>
        <div className="relative mt-2">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            id="ep-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("City, Country")}
            className="pl-8"
            maxLength={60}
          />
        </div>
      </div>

      <div className="px-6 mt-5">
        <Label htmlFor="ep-profession" className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Profession")}
        </Label>
        <div className="relative mt-2">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            id="ep-profession"
            value={profession}
            onChange={(e) => setProfession(e.target.value.slice(0, 80))}
            placeholder={t("e.g. Designing the future, one pixel at a time.")}
            className="pl-8"
            maxLength={80}
          />
        </div>
      </div>
    </>
  );
}

/* ────────────── Step 3 — Bio + Links (social only) ────────────── */
function Step3About(props: {
  t: ReturnType<typeof useT>;
  bio: string;
  setBio: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  github: string;
  setGithub: (v: string) => void;
  twitter: string;
  setTwitter: (v: string) => void;
  spotify: string;
  setSpotify: (v: string) => void;
}) {
  const {
    t,
    bio,
    setBio,
    website,
    setWebsite,
    github,
    setGithub,
    twitter,
    setTwitter,
    spotify,
    setSpotify
  } = props;

  return (
    <>
      <div className="px-6 pt-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="ep-bio" className="text-sm uppercase tracking-wider text-foreground/70">
            {t("Bio")}
          </Label>
          <span className="text-[10px] text-foreground/70 inline-flex items-center gap-1">
            <Sparkles className="size-3 text-cyan-300" />
            {bio.length}/500
          </span>
        </div>
        <textarea
          id="ep-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          placeholder={t("A few sentences about you — what you're building, what you love.")}
          rows={7}
          className="mt-2 w-full rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition"
          maxLength={500}
        />
      </div>

      <div className="px-6 mt-5">
        <Label className="text-sm uppercase tracking-wider text-foreground/70">
          {t("Links")}
        </Label>
        <div className="mt-2 space-y-2">
          <LinkInput
            icon={<Globe className="size-4" />}
            value={website}
            onChange={setWebsite}
            placeholder={t("Personal site (e.g. aria.design)")}
          />
          <LinkInput
            icon={<Github className="size-4" />}
            value={github}
            onChange={(v) => setGithub(v.replace(/^@+/, ""))}
            prefix="@"
            placeholder="github-handle"
          />
          <LinkInput
            icon={<Twitter className="size-4" />}
            value={twitter}
            onChange={(v) => setTwitter(v.replace(/^@+/, ""))}
            prefix="@"
            placeholder="x-handle"
          />
          <LinkInput
            icon={<Music className="size-4" />}
            value={spotify}
            onChange={setSpotify}
            placeholder={t("Now playing (Spotify track or playlist)")}
          />
        </div>
      </div>
    </>
  );
}

/** Icon + (optional `@` prefix) + input row used in the Links section. */
function LinkInput({
  icon,
  value,
  onChange,
  prefix,
  placeholder
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {prefix && <span className="text-xs">{prefix}</span>}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("text-sm", prefix ? "pl-12" : "pl-10")}
      />
    </div>
  );
}
