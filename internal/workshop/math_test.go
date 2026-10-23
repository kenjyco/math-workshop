package workshop

import "testing"

func number(n int) *int { return &n }
func filled(w, h, n int) Draft {
	b := &Board{Width: w, Height: h, Tiles: []Tile{}}
	for id := 1; id <= n; id++ {
		b.Tiles = append(b.Tiles, Tile{ID: id, X: (id - 1) % w, Y: (id - 1) / w})
	}
	return Draft{Factor: b}
}
func TestAdditionFiniteDomain(t *testing.T) {
	for a := 0; a <= 5; a++ {
		for b := 0; b <= 5-a; b++ {
			p := Parameters{A: a, B: b}
			for answer := 0; answer <= 5; answer++ {
				d := Draft{Count: &CounterDraft{Answer: number(answer)}}
				if e := ValidateDraft("count", p, legacyRules("count"), d); e != nil {
					t.Fatal(e)
				}
				want := "retry"
				if answer == a+b {
					want = "correct"
				}
				if got := Evaluate("count", p, d); got.Outcome != want {
					t.Fatalf("%d+%d answer %d: %+v", a, b, answer, got)
				}
			}
		}
	}
	if e := ValidateDraft("count", Parameters{}, legacyRules("count"), Draft{Count: &CounterDraft{Answer: number(6)}}); e == nil {
		t.Fatal("accepted out-of-range answer")
	}
	if e := ValidateDraft("count", Parameters{}, legacyRules("count"), Draft{Count: &CounterDraft{Marked: []int{1}}}); e == nil {
		t.Fatal("created counter in empty groups")
	}
}
func TestRectangles(t *testing.T) {
	for _, tc := range []struct {
		w, h int
		pair string
	}{
		{1, 24, "1 × 24"},
		{24, 1, "1 × 24"},
		{2, 12, "2 × 12"},
		{12, 2, "2 × 12"},
		{3, 8, "3 × 8"},
		{8, 3, "3 × 8"},
		{4, 6, "4 × 6"},
		{6, 4, "4 × 6"},
	} {
		d := filled(tc.w, tc.h, 24)
		if err := ValidateDraft("factor", Parameters{Total: 24}, legacyRules("factor"), d); err != nil {
			t.Fatal(err)
		}
		r := Evaluate("factor", Parameters{Total: 24}, d)
		if r.Outcome != "correct" || r.Pair != tc.pair {
			t.Fatalf("%+v: %+v", tc, r)
		}
	}
	for _, tc := range []struct {
		draft Draft
		want  string
	}{{filled(6, 4, 23), "unfinished"}, {filled(5, 5, 24), "retry"}, {filled(5, 5, 0), "unfinished"}} {
		if got := Evaluate("factor", Parameters{Total: 24}, tc.draft); got.Outcome != tc.want {
			t.Fatal(got)
		}
	}
	for _, mutate := range []func(*Board){
		func(b *Board) { b.Tiles[0].ID = 25 },
		func(b *Board) { b.Tiles[0].ID = 2 },
		func(b *Board) { b.Tiles[0].X = 1 },
		func(b *Board) { b.Tiles[0].Y = -1 },
		func(b *Board) { b.Width = 0 },
		func(b *Board) { b.Height = 24 },
		func(b *Board) { b.Tiles[0].X = 6 },
	} {
		d := filled(6, 4, 24)
		mutate(d.Factor)
		if ValidateDraft("factor", Parameters{Total: 24}, legacyRules("factor"), d) == nil {
			t.Fatalf("invalid board accepted %+v", d)
		}
	}
}

func TestFeedbackContextsAndOrientation(t *testing.T) {
	for _, tc := range []struct {
		a, b int
		want string
	}{
		{0, 0, "Both groups are empty. Try again."},
		{0, 4, "One group is empty. Count the counters in the other group."},
		{5, 0, "One group is empty. Count the counters in the other group."},
		{2, 1, "You chose 1. Count once more, then try again."},
	} {
		r := Evaluate("count", Parameters{A: tc.a, B: tc.b}, Draft{Count: &CounterDraft{Answer: number(1)}})
		if r.Feedback != tc.want || r.Outcome != "retry" || r.FeedbackVersion != "feedback-v2" {
			t.Fatal(r)
		}
	}
	for _, tc := range []struct {
		w, h int
		want string
	}{
		{6, 4, "6 × 4 = 4 × 6 = 24. Same tiles. Same factor pair."},
		{4, 6, "4 × 6 = 6 × 4 = 24. Same tiles. Same factor pair."},
		{8, 3, "8 × 3 = 3 × 8 = 24. Same tiles. Same factor pair."},
	} {
		d := filled(tc.w, tc.h, 24)
		for i := range d.Factor.Tiles {
			d.Factor.Tiles[i].ID = 24 - i
		}
		if err := ValidateDraft("factor", Parameters{Total: 24}, legacyRules("factor"), d); err != nil {
			t.Fatal(err)
		}
		if got := Evaluate("factor", Parameters{Total: 24}, d); got.Feedback != tc.want || got.Outcome != "correct" {
			t.Fatal(got)
		}
	}
}

func legacyRules(activity string) ResolvedRules {
	s := Session{Activity: activity, Validator: LegacyValidator, LessonRevision: 1, LessonID: "count-combine"}
	if activity == "factor" {
		s.LessonID = "factor-24"
		s.Parameters.Total = 24
	}
	r, err := resolveRules(s)
	if err != nil {
		panic(err)
	}
	return r
}
