import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  RotateCcw,
  Sun,
  Moon,
  Utensils,
  ShoppingBag,
  Plus,
  Trash2,
  Calculator,
  FolderOpen,
  Download,
  Upload,
  ListTodo,
  CheckSquare,
  Square,
  Flame,
  Grid,
  Sparkles,
  Edit2,
  X,
  Beef,
  PlusCircle,
  StickyNote,
  CheckCircle,
} from "lucide-react";

type ActiveTool = "home" | "evaluator" | "meal" | "mealtracker" | "reminders";
type Step = "intro" | "item" | "questions" | "result";

interface ToolConfig {
  id: ActiveTool;
  label: string;
  subtitle: string;
  icon: any;
  badge: string;
}

const TOOLS: ToolConfig[] = [
  {
    id: "evaluator",
    label: "Purchase Evaluator",
    subtitle: "Sanity-check impulse buys before spending money",
    icon: ShoppingBag,
    badge: "Budgeting",
  },
  {
    id: "meal",
    label: "Meal Cost Calculator",
    subtitle: "Calculate portion costs & recipe budget breakdowns",
    icon: Utensils,
    badge: "Budgeting",
  },
  {
    id: "mealtracker",
    label: "Meal & Macro Tracker",
    subtitle: "Track protein, fat & calories daily — link with calculator",
    icon: Flame,
    badge: "Health",
  },
  {
    id: "reminders",
    label: "Reminders",
    subtitle: "Organize tasks, shopping lists & to-dos with item notes",
    icon: ListTodo,
    badge: "Productivity",
  },
];

interface Question {
  id: string;
  text: string;
  subtext: string;
  yes: { label: string; score: number };
  no: { label: string; score: number };
}

interface Ingredient {
  id: string;
  name: string;
  unit: "g" | "ml" | "pcs";
  amountPerMeal: string;
  amountPerContainer: string;
  pricePerContainer: string;
}

interface MealProfile {
  id: string;
  name: string;
  mealsPerDay: string;
  daysPerWeek: string;
  ingredients: Ingredient[];
}

interface TrackedMeal {
  id: string;
  date: string;
  name: string;
  protein: number;
  fat: number;
  calories: number;
  timeOfDay: "Breakfast" | "Lunch" | "Dinner" | "Snack";
}

interface ReminderItem {
  id: string;
  text: string;
  note?: string;
  completed: boolean;
  createdAt: string;
}

interface ReminderList {
  id: string;
  name: string;
  color: string;
  items: ReminderItem[];
}

type Answers = Record<string, "yes" | "no">;

// ── Default data ──────────────────────────────────────────────────────────────

const DEFAULT_SAVED_MEALS: MealProfile[] = [
  {
    id: "default-1",
    name: "Chicken & Rice Bowl",
    mealsPerDay: "1",
    daysPerWeek: "7",
    ingredients: [
      {
        id: "1",
        name: "Chicken Breast",
        unit: "g",
        amountPerMeal: "200",
        amountPerContainer: "1000",
        pricePerContainer: "8.00",
      },
      {
        id: "2",
        name: "Jasmine Rice",
        unit: "g",
        amountPerMeal: "100",
        amountPerContainer: "2000",
        pricePerContainer: "3.50",
      },
    ],
  },
  {
    id: "default-2",
    name: "Morning Smoothie",
    mealsPerDay: "1",
    daysPerWeek: "7",
    ingredients: [
      {
        id: "s1",
        name: "Whole Milk",
        unit: "ml",
        amountPerMeal: "300",
        amountPerContainer: "2000",
        pricePerContainer: "1.65",
      },
      {
        id: "s2",
        name: "Whey Protein",
        unit: "g",
        amountPerMeal: "30",
        amountPerContainer: "1000",
        pricePerContainer: "24.00",
      },
    ],
  },
];

const DEFAULT_TRACKED_MEALS: TrackedMeal[] = [
  {
    id: "track-1",
    date: new Date().toISOString().split("T")[0],
    name: "Chicken & Rice Bowl",
    protein: 48,
    fat: 12,
    calories: 550,
    timeOfDay: "Lunch",
  },
  {
    id: "track-2",
    date: new Date().toISOString().split("T")[0],
    name: "Morning Smoothie",
    protein: 32,
    fat: 9,
    calories: 380,
    timeOfDay: "Breakfast",
  },
];

const DEFAULT_REMINDER_LISTS: ReminderList[] = [
  {
    id: "list-buy",
    name: "To Buy",
    color: "amber",
    items: [
      {
        id: "tb-1",
        text: "Chicken breast (1kg pack)",
        note: "Look for organic or free range",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "tb-2",
        text: "Jasmine Rice (2kg)",
        note: "Aromatic brand preferred",
        completed: true,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "list-daily",
    name: "Daily Tasks",
    color: "emerald",
    items: [
      {
        id: "dt-1",
        text: "Track afternoon macros & protein intake",
        note: "Aim for 120g+ total protein today",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "dt-2",
        text: "Review weekly budget before buying tech gear",
        note: "Use the Purchase Evaluator tool",
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "list-todo",
    name: "To Do",
    color: "indigo",
    items: [
      {
        id: "td-1",
        text: "Prep meal bowls for upcoming work week",
        note: "3 portions chicken & rice",
        completed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "td-2",
        text: "Export local toolbox data backup",
        note: "JSON backup in toolbar",
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function buildQuestions(
  priceNum: number | null,
  hourlyRateNum: number | null,
): Question[] {
  const base: Question[] = [
    {
      id: "need",
      text: "Do you actually need this?",
      subtext:
        "Not want — need. Would your life or work be meaningfully worse without it?",
      yes: { label: "Yes, I need it", score: 3 },
      no: { label: "No, it's a want", score: 0 },
    },
    {
      id: "budget",
      text: "Is it within your budget?",
      subtext:
        "Buying it won't require dipping into savings, borrowing, or skipping a bill.",
      yes: { label: "Comfortably, yes", score: 3 },
      no: { label: "It's a stretch", score: -1 },
    },
  ];
  if (priceNum && hourlyRateNum && hourlyRateNum > 0) {
    const hours = priceNum / hourlyRateNum;
    const fmt =
      hours < 1
        ? `${Math.round(hours * 60)} minutes`
        : hours % 1 === 0
          ? `${hours} hour${hours !== 1 ? "s" : ""}`
          : `${hours.toFixed(1)} hours`;
    base.push({
      id: "labor_hours",
      text: `That's ${fmt} of your work.`,
      subtext: `At your pay rate, this purchase costs you ${fmt} of labor. Imagine those hours gone from your life. Does that feel worth it?`,
      yes: { label: "Yes, still worth it", score: 2 },
      no: { label: "That puts it differently", score: -2 },
    });
  }
  base.push(
    {
      id: "waited",
      text: "Have you waited at least 24 hours?",
      subtext:
        "Most impulse regret happens in the first day. Time is a filter.",
      yes: { label: "Yes, I've thought it over", score: 2 },
      no: { label: "No, I want it now", score: -2 },
    },
    {
      id: "alternative",
      text: "Do you already own something similar?",
      subtext: "A close substitute you could use instead.",
      yes: { label: "Yes, I have one", score: -2 },
      no: { label: "No, nothing like it", score: 1 },
    },
    {
      id: "cost_per_use",
      text: "Will you use it regularly?",
      subtext:
        "At least once a week, or consistently for the purpose you're buying it for.",
      yes: { label: "Yes, often", score: 2 },
      no: { label: "Probably not that much", score: -1 },
    },
    {
      id: "regret",
      text: "Would you regret not buying it?",
      subtext: "Imagine it sold out tomorrow. How would you feel in a month?",
      yes: { label: "I'd genuinely miss it", score: 2 },
      no: { label: "I'd move on fine", score: -1 },
    },
  );
  return base;
}

function getVerdict(score: number, maxScore: number) {
  const ratio = score / maxScore;
  if (ratio >= 0.65)
    return {
      label: "Buy it.",
      headline: "Go on then.",
      body: "Wow, a responsible purchase. Hard to find one of those these days. You've thought this through. It fits your life, your budget, and you'll actually use it. Go ahead.",
      verdict: "accent" as const,
    };
  if (ratio >= 0.35)
    return {
      label: "Wait a week.",
      headline: "Not a clear yes.",
      body: "There are real reasons to want this, but also some concerns worth keeping in mind. Give it seven more days. If you still want it, that's your answer.",
      verdict: "warning" as const,
    };
  return {
    label: "Skip it.",
    headline: "Nuh uh.",
    body: "Probably not a good purchase. Even if you would not regret it, it is most probably a waste of money. Put the fries in the bag brodie.",
    verdict: "danger" as const,
  };
}

function parsePrice(val: string): number | null {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function sanitizeFloat(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
}

function ingredientCost(ing: Ingredient): number {
  const meal = parsePrice(ing.amountPerMeal);
  const pack = parsePrice(ing.amountPerContainer);
  const price = parsePrice(ing.pricePerContainer);
  if (meal !== null && pack !== null && pack > 0 && price !== null)
    return (meal / pack) * price;
  return 0;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && Array.isArray(parsed)) return parsed as T;
    if (typeof fallback === "object" && parsed) return parsed as T;
    return parsed as T;
  } catch {
    return fallback;
  }
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(() =>
    loadLS("active_tool", "home"),
  );
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    loadLS("theme", "dark"),
  );

  // Backup modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Evaluator
  const [step, setStep] = useState<Step>("intro");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  // Meal Calculator
  const [savedMeals, setSavedMeals] = useState<MealProfile[]>(() =>
    loadLS("saved_meals", DEFAULT_SAVED_MEALS),
  );
  const [selectedMealId, setSelectedMealId] = useState<string>(() => {
    const meals = loadLS<MealProfile[]>("saved_meals", DEFAULT_SAVED_MEALS);
    return meals[0]?.id || "";
  });
  const [mealName, setMealName] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("1");
  const [daysPerWeek, setDaysPerWeek] = useState("7");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Meal Tracker
  const [trackedMeals, setTrackedMeals] = useState<TrackedMeal[]>(() =>
    loadLS("meal_tracker_entries", DEFAULT_TRACKED_MEALS),
  );
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackProtein, setNewTrackProtein] = useState("");
  const [newTrackFat, setNewTrackFat] = useState("");
  const [newTrackCalories, setNewTrackCalories] = useState("");
  const [newTrackTime, setNewTrackTime] = useState<
    "Breakfast" | "Lunch" | "Dinner" | "Snack"
  >("Lunch");
  const [showImportModal, setShowImportModal] = useState(false);

  // Reminders
  const [reminderLists, setReminderLists] = useState<ReminderList[]>(() => {
    const saved = loadLS<ReminderList[]>("reminder_lists", []);
    return saved.length > 0 ? saved : DEFAULT_REMINDER_LISTS;
  });
  const [activeListId, setActiveListId] = useState<string>(() => {
    const saved = loadLS<ReminderList[]>(
      "reminder_lists",
      DEFAULT_REMINDER_LISTS,
    );
    return (
      (saved.length > 0 ? saved : DEFAULT_REMINDER_LISTS)[0]?.id || "list-buy"
    );
  });
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editedListName, setEditedListName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItemNote, setNewItemNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(
    null,
  );
  const [editedNoteText, setEditedNoteText] = useState("");

  // ── Persistence effects ───────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem("active_tool", JSON.stringify(activeTool));
  }, [activeTool]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("saved_meals", JSON.stringify(savedMeals));
  }, [savedMeals]);
  useEffect(() => {
    localStorage.setItem("meal_tracker_entries", JSON.stringify(trackedMeals));
  }, [trackedMeals]);
  useEffect(() => {
    localStorage.setItem("reminder_lists", JSON.stringify(reminderLists));
  }, [reminderLists]);

  // Sync meal editor fields when selection changes
  useEffect(() => {
    const m = savedMeals.find((m) => m.id === selectedMealId);
    if (m) {
      setMealName(m.name);
      setMealsPerDay(m.mealsPerDay);
      setDaysPerWeek(m.daysPerWeek);
      setIngredients(m.ingredients);
    } else if (savedMeals.length > 0) {
      const first = savedMeals[0];
      setSelectedMealId(first.id);
      setMealName(first.name);
      setMealsPerDay(first.mealsPerDay);
      setDaysPerWeek(first.daysPerWeek);
      setIngredients(first.ingredients);
    } else {
      setSelectedMealId("");
      setMealName("");
      setMealsPerDay("1");
      setDaysPerWeek("7");
      setIngredients([]);
    }
  }, [selectedMealId, savedMeals]);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // ── Export / Import ───────────────────────────────────────────────────────

  const handleExport = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "TeasToolbox",
            version: "2.0",
            exportedAt: new Date().toISOString(),
            saved_meals: savedMeals,
            meal_tracker_entries: trackedMeals,
            reminder_lists: reminderLists,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teas-toolbox-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target?.result as string);
        if (p.saved_meals && Array.isArray(p.saved_meals))
          setSavedMeals(p.saved_meals);
        if (p.meal_tracker_entries && Array.isArray(p.meal_tracker_entries))
          setTrackedMeals(p.meal_tracker_entries);
        if (p.reminder_lists && Array.isArray(p.reminder_lists))
          setReminderLists(p.reminder_lists);
        showToast("Backup imported!");
        setShowExportModal(false);
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  // ── Evaluator ─────────────────────────────────────────────────────────────

  const priceNum = parsePrice(itemPrice);
  const hourlyRateNum = parsePrice(hourlyRate);
  const questions = buildQuestions(priceNum, hourlyRateNum);
  const currentQ = questions[currentQIdx];
  const maxScore = questions.reduce(
    (a, q) => a + Math.max(q.yes.score, q.no.score),
    0,
  );

  const handleAnswer = (val: "yes" | "no") => {
    if (!currentQ) return;
    const next = { ...answers, [currentQ.id]: val };
    setAnswers(next);
    if (currentQIdx < questions.length - 1) setCurrentQIdx((i) => i + 1);
    else setStep("result");
  };

  const calcScore = () =>
    questions.reduce((acc, q) => {
      const a = answers[q.id];
      return acc + (a === "yes" ? q.yes.score : a === "no" ? q.no.score : 0);
    }, 0);

  const resetEvaluator = () => {
    setStep("intro");
    setItemName("");
    setItemPrice("");
    setHourlyRate("");
    setCurrentQIdx(0);
    setAnswers({});
  };

  // ── Meal Calculator ───────────────────────────────────────────────────────

  const updateMealField = (
    field: "name" | "mealsPerDay" | "daysPerWeek",
    value: string,
  ) => {
    if (field === "name") setMealName(value);
    if (field === "mealsPerDay") setMealsPerDay(sanitizeFloat(value));
    if (field === "daysPerWeek") setDaysPerWeek(sanitizeFloat(value));
    setSavedMeals((prev) =>
      prev.map((m) => (m.id === selectedMealId ? { ...m, [field]: value } : m)),
    );
  };

  const createNewMeal = () => {
    const m: MealProfile = {
      id: "meal-" + Date.now(),
      name: "New Meal Plan",
      mealsPerDay: "1",
      daysPerWeek: "7",
      ingredients: [
        {
          id: "ing-1",
          name: "Main Ingredient",
          unit: "g",
          amountPerMeal: "150",
          amountPerContainer: "1000",
          pricePerContainer: "5.00",
        },
      ],
    };
    setSavedMeals((p) => [...p, m]);
    setSelectedMealId(m.id);
  };

  const deleteMeal = (id: string) =>
    setSavedMeals((prev) => {
      const f = prev.filter((m) => m.id !== id);
      if (f.length > 0 && selectedMealId === id) setSelectedMealId(f[0].id);
      else if (f.length === 0) setSelectedMealId("");
      return f;
    });

  const addIngredient = () => {
    if (!selectedMealId) return;
    const ing: Ingredient = {
      id: "ing-" + Date.now(),
      name: "",
      unit: "g",
      amountPerMeal: "",
      amountPerContainer: "",
      pricePerContainer: "",
    };
    const updated = [...ingredients, ing];
    setIngredients(updated);
    setSavedMeals((p) =>
      p.map((m) =>
        m.id === selectedMealId ? { ...m, ingredients: updated } : m,
      ),
    );
  };

  const updateIngredient = (
    id: string,
    field: keyof Ingredient,
    value: string,
  ) => {
    const val = [
      "amountPerMeal",
      "amountPerContainer",
      "pricePerContainer",
    ].includes(field)
      ? sanitizeFloat(value)
      : value;
    const updated = ingredients.map((i) =>
      i.id === id ? { ...i, [field]: val } : i,
    );
    setIngredients(updated);
    setSavedMeals((p) =>
      p.map((m) =>
        m.id === selectedMealId ? { ...m, ingredients: updated } : m,
      ),
    );
  };

  const deleteIngredient = (id: string) => {
    const updated = ingredients.filter((i) => i.id !== id);
    setIngredients(updated);
    setSavedMeals((p) =>
      p.map((m) =>
        m.id === selectedMealId ? { ...m, ingredients: updated } : m,
      ),
    );
  };

  const costPerMeal = ingredients.reduce((s, i) => s + ingredientCost(i), 0);
  const weeklyCost =
    costPerMeal *
    (parsePrice(mealsPerDay) || 0) *
    (parsePrice(daysPerWeek) || 0);
  const monthlyCost = weeklyCost * (52 / 12);

  // ── Meal Tracker ──────────────────────────────────────────────────────────

  const dayMeals = trackedMeals.filter((m) => m.date === selectedDate);
  const totalProtein = dayMeals.reduce((a, m) => a + m.protein, 0);
  const totalFat = dayMeals.reduce((a, m) => a + m.fat, 0);
  const totalCalories = dayMeals.reduce((a, m) => a + m.calories, 0);

  const addTrackedMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;
    setTrackedMeals((p) => [
      {
        id: "track-" + Date.now(),
        date: selectedDate,
        name: newTrackName.trim(),
        protein: parseFloat(newTrackProtein) || 0,
        fat: parseFloat(newTrackFat) || 0,
        calories: parseFloat(newTrackCalories) || 0,
        timeOfDay: newTrackTime,
      },
      ...p,
    ]);
    setNewTrackName("");
    setNewTrackProtein("");
    setNewTrackFat("");
    setNewTrackCalories("");
    showToast("Meal logged!");
  };

  const sendTrackedToCalc = (m: TrackedMeal) => {
    setSavedMeals((p) => [
      ...p,
      {
        id: "from-tracker-" + Date.now(),
        name: m.name,
        mealsPerDay: "1",
        daysPerWeek: "7",
        ingredients: [
          {
            id: "ing-t1",
            name: `${m.name} portion`,
            unit: "pcs",
            amountPerMeal: "1",
            amountPerContainer: "1",
            pricePerContainer: "3.50",
          },
        ],
      },
    ]);
    showToast(`"${m.name}" added to Calculator presets`);
  };

  // ── Reminders ─────────────────────────────────────────────────────────────

  const activeList =
    reminderLists.find((l) => l.id === activeListId) || reminderLists[0];

  const addList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const nl: ReminderList = {
      id: "list-" + Date.now(),
      name: newListName.trim(),
      color: "emerald",
      items: [],
    };
    setReminderLists((p) => [...p, nl]);
    setActiveListId(nl.id);
    setNewListName("");
    showToast(`List "${nl.name}" created`);
  };

  const renameList = (id: string) => {
    if (!editedListName.trim()) {
      setEditingListId(null);
      return;
    }
    setReminderLists((p) =>
      p.map((l) => (l.id === id ? { ...l, name: editedListName.trim() } : l)),
    );
    setEditingListId(null);
    setEditedListName("");
  };

  const deleteList = (id: string) => {
    if (reminderLists.length <= 1) {
      alert("Keep at least one list.");
      return;
    }
    setReminderLists((p) => {
      const f = p.filter((l) => l.id !== id);
      if (activeListId === id) setActiveListId(f[0].id);
      return f;
    });
    showToast("List deleted");
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !activeList) return;
    const item: ReminderItem = {
      id: "item-" + Date.now(),
      text: newItemText.trim(),
      note: newItemNote.trim() || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setReminderLists((p) =>
      p.map((l) =>
        l.id === activeList.id ? { ...l, items: [item, ...l.items] } : l,
      ),
    );
    setNewItemText("");
    setNewItemNote("");
    setShowNoteInput(false);
  };

  const toggleItem = (itemId: string) => {
    if (!activeList) return;
    setReminderLists((p) =>
      p.map((l) =>
        l.id === activeList.id
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, completed: !i.completed } : i,
              ),
            }
          : l,
      ),
    );
  };

  const deleteItem = (itemId: string) => {
    if (!activeList) return;
    setReminderLists((p) =>
      p.map((l) =>
        l.id === activeList.id
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l,
      ),
    );
  };

  const saveItemNote = (itemId: string) => {
    if (!activeList) return;
    setReminderLists((p) =>
      p.map((l) =>
        l.id === activeList.id
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId
                  ? { ...i, note: editedNoteText.trim() || undefined }
                  : i,
              ),
            }
          : l,
      ),
    );
    setEditingNoteItemId(null);
    setEditedNoteText("");
  };

  // ── Shared style tokens ───────────────────────────────────────────────────

  const card = "bg-card border border-border rounded-lg";
  const input =
    "w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground";
  const btnPrimary =
    "px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 transition-opacity";
  const btnMuted =
    "px-3 py-1.5 bg-muted text-muted-foreground text-xs font-medium rounded hover:bg-border transition-colors flex items-center gap-1.5";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 right-4 z-50 bg-accent text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export / Import Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`${card} p-6 max-w-md w-full shadow-2xl space-y-5`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Data Backup
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Export or restore all your local tool data
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Export JSON backup</p>
                    <p className="text-xs text-muted-foreground">
                      Downloads all meals, logs & lists
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    className={btnPrimary + " flex items-center gap-1.5"}
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Import JSON backup</p>
                    <p className="text-xs text-muted-foreground">
                      Restore from a previous backup file
                    </p>
                  </div>
                  <label className={btnMuted + " cursor-pointer"}>
                    <Upload className="w-3.5 h-3.5" /> Import
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                🔒 Data stays entirely on your device — no servers, no accounts.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => setActiveTool("home")}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ☕'s Toolbox
            </span>
          </button>

          <div className="flex items-center gap-2">
            {activeTool !== "home" && (
              <button
                onClick={() => setActiveTool("home")}
                className={btnMuted}
              >
                <Grid className="w-3.5 h-3.5" /> Menu
              </button>
            )}
            <button
              onClick={() => setShowExportModal(true)}
              className={btnMuted}
              title="Export / Import data backup"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={btnMuted}
              title="Toggle light / dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════ HOME ═══ */}
          {activeTool === "home" && (
            <motion.div
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-8"
            >
              <div>
                <h1
                  className="text-4xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Hi there.
                </h1>
                <p className="text-muted-foreground">
                  Pick a tool below or export your data any time.
                </p>
              </div>

              {/* Export bar */}
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border">
                <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">
                  Your data lives locally in your browser. Export a backup so
                  you never lose it.
                </p>
                <button
                  onClick={() => setShowExportModal(true)}
                  className={btnPrimary}
                >
                  Export / Import
                </button>
              </div>

              {/* Tool cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <motion.button
                      key={tool.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setActiveTool(tool.id)}
                      className={`${card} p-6 text-left group hover:border-primary transition-colors flex flex-col gap-4`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-muted rounded-lg text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {tool.badge}
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-lg font-semibold mb-1"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {tool.label}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tool.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Open{" "}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════ EVALUATOR ═══ */}
          {activeTool === "evaluator" && (
            <motion.div
              key="evaluator"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Purchase Evaluator
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Think before you spend.
                  </p>
                </div>
                <button onClick={resetEvaluator} className={btnMuted}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>

              {step === "intro" && (
                <div className={`${card} p-8 text-center space-y-5`}>
                  <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3
                      className="text-xl font-semibold mb-1"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Think Before Buying
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Answer a few honest questions about your potential
                      purchase to get an honest verdict.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("item")}
                    className={`${btnPrimary} inline-flex items-center gap-2`}
                  >
                    Start <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === "item" && (
                <div className={`${card} p-6 space-y-5`}>
                  <h3
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    About the item
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Item name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Wireless Headphones"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Price (£, optional)
                      </label>
                      <input
                        type="text"
                        placeholder="120.00"
                        value={itemPrice}
                        onChange={(e) =>
                          setItemPrice(sanitizeFloat(e.target.value))
                        }
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Your hourly pay (£/hr, optional)
                      </label>
                      <input
                        type="text"
                        placeholder="25.00"
                        value={hourlyRate}
                        onChange={(e) =>
                          setHourlyRate(sanitizeFloat(e.target.value))
                        }
                        className={input}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("questions")}
                    className={btnPrimary}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {step === "questions" && currentQ && (
                <div className={`${card} p-6 space-y-6`}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Question {currentQIdx + 1} of {questions.length}
                  </p>
                  <div>
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {currentQ.text}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentQ.subtext}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAnswer("yes")}
                      className="py-3.5 border border-border rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                    >
                      {currentQ.yes.label}
                    </button>
                    <button
                      onClick={() => handleAnswer("no")}
                      className="py-3.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {currentQ.no.label}
                    </button>
                  </div>
                </div>
              )}

              {step === "result" &&
                (() => {
                  const v = getVerdict(calcScore(), maxScore);
                  return (
                    <div className={`${card} p-8 text-center space-y-4`}>
                      <span className="inline-block text-xs font-bold uppercase tracking-widest border border-border px-3 py-1 rounded-full text-muted-foreground">
                        {v.label}
                      </span>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {v.headline}
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                        {v.body}
                      </p>
                      <button
                        onClick={resetEvaluator}
                        className={`${btnMuted} mx-auto`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Evaluate another
                      </button>
                    </div>
                  );
                })()}
            </motion.div>
          )}

          {/* ══════════════════════════════════ MEAL CALC ═══ */}
          {activeTool === "meal" && (
            <motion.div
              key="meal"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Meal Cost Calculator
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Break down ingredient costs per portion.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className={btnMuted}
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Export / Import
                  </button>
                  <button
                    onClick={createNewMeal}
                    className={btnPrimary + " flex items-center gap-1.5"}
                  >
                    <Plus className="w-3.5 h-3.5" /> New meal
                  </button>
                </div>
              </div>

              {/* Preset tabs */}
              {savedMeals.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {savedMeals.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMealId(m.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-colors border ${
                        selectedMealId === m.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.name || "Untitled"}
                      {selectedMealId === m.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeal(m.id);
                          }}
                          className="hover:opacity-60 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-border rounded-lg text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No meal plans saved yet.
                  </p>
                  <button
                    onClick={createNewMeal}
                    className={`${btnPrimary} inline-flex items-center gap-1.5`}
                  >
                    <Plus className="w-4 h-4" /> Create first meal
                  </button>
                </div>
              )}

              {selectedMealId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Ingredients */}
                  <div className={`${card} p-5 lg:col-span-2 space-y-5`}>
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={mealName}
                        onChange={(e) =>
                          updateMealField("name", e.target.value)
                        }
                        placeholder="Meal name"
                        className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-0.5 flex-1 mr-4"
                        style={{ fontFamily: "var(--font-display)" }}
                      />
                      <button onClick={addIngredient} className={btnMuted}>
                        <Plus className="w-3.5 h-3.5" /> Ingredient
                      </button>
                    </div>

                    {/* Column headers */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      <span className="col-span-4">Ingredient</span>
                      <span className="col-span-2">Per meal</span>
                      <span className="col-span-2">Pack size</span>
                      <span className="col-span-3">Pack price</span>
                      <span className="col-span-1 text-right">Cost</span>
                    </div>

                    <div className="space-y-2">
                      {ingredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 bg-muted rounded-lg"
                        >
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              placeholder="Name"
                              value={ing.name}
                              onChange={(e) =>
                                updateIngredient(ing.id, "name", e.target.value)
                              }
                              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="e.g. 200"
                              value={ing.amountPerMeal}
                              onChange={(e) =>
                                updateIngredient(
                                  ing.id,
                                  "amountPerMeal",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="e.g. 1000"
                              value={ing.amountPerContainer}
                              onChange={(e) =>
                                updateIngredient(
                                  ing.id,
                                  "amountPerContainer",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="sm:col-span-3 flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              $
                            </span>
                            <input
                              type="text"
                              placeholder="8.00"
                              value={ing.pricePerContainer}
                              onChange={(e) =>
                                updateIngredient(
                                  ing.id,
                                  "pricePerContainer",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                            <span className="text-xs font-semibold text-muted-foreground sm:hidden">
                              Cost:{" "}
                            </span>
                            <span className="text-xs font-medium">
                              ${ingredientCost(ing).toFixed(2)}
                            </span>
                            <button
                              onClick={() => deleteIngredient(ing.id)}
                              className="text-muted-foreground hover:text-danger transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className={`${card} p-5 space-y-4 h-fit`}>
                    <h3
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Cost summary
                    </h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Per meal
                      </p>
                      <p className="text-3xl font-bold">
                        ${costPerMeal.toFixed(2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Weekly
                        </p>
                        <p className="text-base font-semibold">
                          ${weeklyCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Monthly
                        </p>
                        <p className="text-base font-semibold">
                          ${monthlyCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          Meals / day
                        </label>
                        <input
                          type="text"
                          value={mealsPerDay}
                          onChange={(e) =>
                            updateMealField("mealsPerDay", e.target.value)
                          }
                          className="w-20 bg-background border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          Days / week
                        </label>
                        <input
                          type="text"
                          value={daysPerWeek}
                          onChange={(e) =>
                            updateMealField("daysPerWeek", e.target.value)
                          }
                          className="w-20 bg-background border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════ MEAL TRACKER ═══ */}
          {activeTool === "mealtracker" && (
            <motion.div
              key="mealtracker"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Meal & Macro Tracker
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Log protein, fat & calories for the day.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className={btnMuted}
                  >
                    <Utensils className="w-3.5 h-3.5" /> Pull from Calculator
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className={btnMuted}
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Export / Import
                  </button>
                </div>
              </div>

              {/* Pull from calculator modal */}
              <AnimatePresence>
                {showImportModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <div
                      className={`${card} p-5 max-w-sm w-full shadow-xl space-y-4`}
                    >
                      <div className="flex items-center justify-between">
                        <h3
                          className="font-semibold"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Import from Calculator
                        </h3>
                        <button
                          onClick={() => setShowImportModal(false)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select a saved meal to auto-fill the name field:
                      </p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {savedMeals.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setNewTrackName(m.name);
                              setShowImportModal(false);
                              showToast(`"${m.name}" loaded`);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-lg bg-muted hover:bg-border text-sm transition-colors"
                          >
                            {m.name}
                          </button>
                        ))}
                        {savedMeals.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No saved meals in Calculator.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Daily totals */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Protein",
                    value: totalProtein,
                    unit: "g",
                    icon: Beef,
                  },
                  { label: "Fat", value: totalFat, unit: "g", icon: Flame },
                  {
                    label: "Calories",
                    value: totalCalories,
                    unit: "kcal",
                    icon: Sparkles,
                  },
                ].map(({ label, value, unit, icon: Icon }) => (
                  <div key={label} className={`${card} p-4`}>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      <span>{label}</span>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-2xl font-bold">
                      {value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {unit}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Log form */}
                <form
                  onSubmit={addTrackedMeal}
                  className={`${card} p-5 space-y-4`}
                >
                  <h3
                    className="font-semibold flex items-center gap-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <PlusCircle className="w-4 h-4 text-muted-foreground" /> Log
                    a meal
                  </h3>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Meal name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Steak & Eggs"
                      value={newTrackName}
                      onChange={(e) => setNewTrackName(e.target.value)}
                      className={input}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        placeholder="35"
                        value={newTrackProtein}
                        onChange={(e) => setNewTrackProtein(e.target.value)}
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        placeholder="15"
                        value={newTrackFat}
                        onChange={(e) => setNewTrackFat(e.target.value)}
                        className={input}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        placeholder="450"
                        value={newTrackCalories}
                        onChange={(e) => setNewTrackCalories(e.target.value)}
                        className={input}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Time of day
                    </label>
                    <select
                      value={newTrackTime}
                      onChange={(e) => setNewTrackTime(e.target.value as any)}
                      className={input}
                    >
                      {["Breakfast", "Lunch", "Dinner", "Snack"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className={`${btnPrimary} w-full`}>
                    Add meal entry
                  </button>
                </form>

                {/* Day log */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Logged — {selectedDate}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {dayMeals.length}{" "}
                      {dayMeals.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  {dayMeals.length === 0 ? (
                    <div
                      className={`${card} p-8 text-center text-sm text-muted-foreground`}
                    >
                      No meals logged for this date.
                    </div>
                  ) : (
                    dayMeals.map((m) => (
                      <div
                        key={m.id}
                        className={`${card} p-4 flex items-center justify-between gap-4`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {m.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {m.timeOfDay}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>
                              P:{" "}
                              <strong className="text-foreground">
                                {m.protein}g
                              </strong>
                            </span>
                            <span>
                              F:{" "}
                              <strong className="text-foreground">
                                {m.fat}g
                              </strong>
                            </span>
                            <span>
                              Cal:{" "}
                              <strong className="text-foreground">
                                {m.calories}kcal
                              </strong>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => sendTrackedToCalc(m)}
                            className={btnMuted}
                            title="Send to Calculator presets"
                          >
                            <Utensils className="w-3 h-3" /> → Calc
                          </button>
                          <button
                            onClick={() =>
                              setTrackedMeals((p) =>
                                p.filter((t) => t.id !== m.id),
                              )
                            }
                            className="text-muted-foreground hover:text-danger transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════ REMINDERS ═══ */}
          {activeTool === "reminders" && (
            <motion.div
              key="reminders"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Lists & Reminders
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Task lists with optional item notes.
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(true)}
                  className={btnMuted}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Export / Import
                </button>
              </div>

              {/* List tabs + add */}
              <div className="flex items-center gap-2 flex-wrap">
                {reminderLists.map((list) => (
                  <div key={list.id}>
                    {editingListId === list.id ? (
                      <div className="flex items-center gap-1 border border-primary rounded px-2 py-1">
                        <input
                          autoFocus
                          type="text"
                          value={editedListName}
                          onChange={(e) => setEditedListName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && renameList(list.id)
                          }
                          className="bg-transparent text-xs font-medium focus:outline-none w-24 text-foreground"
                        />
                        <button
                          onClick={() => renameList(list.id)}
                          className="text-accent text-xs font-semibold hover:opacity-75"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${activeListId === list.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        <button onClick={() => setActiveListId(list.id)}>
                          {list.name}
                          <span className="ml-1.5 opacity-60">
                            ({list.items.filter((i) => !i.completed).length})
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingListId(list.id);
                            setEditedListName(list.name);
                          }}
                          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteList(list.id);
                          }}
                          className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* New list input */}
                <form onSubmit={addList} className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="+ New list"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground w-24"
                  />
                  {newListName && (
                    <button
                      type="submit"
                      className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity"
                    >
                      Add
                    </button>
                  )}
                </form>
              </div>

              {/* Active list */}
              {activeList && (
                <div className={`${card} p-5 space-y-5`}>
                  <div className="border-b border-border pb-4">
                    <h3
                      className="font-semibold text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {activeList.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {activeList.items.length} items ·{" "}
                      {activeList.items.filter((i) => i.completed).length} done
                    </p>
                  </div>

                  {/* Add item form */}
                  <form onSubmit={addItem} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Add to "${activeList.name}"…`}
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        className={`${input} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNoteInput(!showNoteInput)}
                        className={`px-3 py-2 border rounded text-xs font-medium flex items-center gap-1 transition-colors ${showNoteInput ? "bg-muted border-primary text-foreground" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        <StickyNote className="w-3.5 h-3.5" /> Note
                      </button>
                      <button type="submit" className={btnPrimary}>
                        Add
                      </button>
                    </div>
                    {showNoteInput && (
                      <textarea
                        placeholder="Optional note for this item…"
                        value={newItemNote}
                        onChange={(e) => setNewItemNote(e.target.value)}
                        rows={2}
                        className={`${input} resize-none`}
                      />
                    )}
                  </form>

                  {/* Items */}
                  <div className="space-y-2">
                    {activeList.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No items yet — add one above.
                      </p>
                    ) : (
                      activeList.items.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-3 space-y-2 transition-opacity ${item.completed ? "opacity-50 bg-muted border-border" : "bg-background border-border"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <button
                                onClick={() => toggleItem(item.id)}
                                className="text-muted-foreground hover:text-accent transition-colors shrink-0"
                              >
                                {item.completed ? (
                                  <CheckSquare className="w-4 h-4 text-accent" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <span
                                className={`text-sm truncate ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                              >
                                {item.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingNoteItemId(
                                    editingNoteItemId === item.id
                                      ? null
                                      : item.id,
                                  );
                                  setEditedNoteText(item.note || "");
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit note"
                              >
                                <StickyNote className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1 text-muted-foreground hover:text-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Note inline edit */}
                          {editingNoteItemId === item.id ? (
                            <div className="flex gap-2 pl-6">
                              <input
                                type="text"
                                value={editedNoteText}
                                onChange={(e) =>
                                  setEditedNoteText(e.target.value)
                                }
                                placeholder="Note…"
                                className="flex-1 bg-muted border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                              />
                              <button
                                onClick={() => saveItemNote(item.id)}
                                className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity px-2"
                              >
                                Save
                              </button>
                            </div>
                          ) : item.note ? (
                            <div className="pl-6 flex items-start gap-1.5 text-xs text-muted-foreground">
                              <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{item.note}</span>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        Data stored locally. No agenda. Just honest tools and a calculator.
      </footer>
    </div>
  );
}
