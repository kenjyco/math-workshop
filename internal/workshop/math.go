package workshop

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
)

const Validator = "math-v2"

var ErrInvalid = errors.New("invalid input")
var ErrConflict = errors.New("version or submission conflict")
var ErrNotFound = errors.New("learner or session not found")

type Parameters struct {
	A     int    `json:"a"`
	B     int    `json:"b"`
	Total int    `json:"total"`
	Rules *Rules `json:"rules,omitempty"`
}
type CounterDraft struct {
	Answer   *int  `json:"answer"`
	Marked   []int `json:"marked"`
	Together bool  `json:"together"`
}
type Tile struct {
	ID int `json:"id"`
	X  int `json:"x"`
	Y  int `json:"y"`
}
type Board struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Tiles  []Tile `json:"tiles"`
}
type Draft struct {
	Count  *CounterDraft `json:"count,omitempty"`
	Factor *Board        `json:"factor,omitempty"`
}
type Result struct {
	SessionID       string `json:"sessionId"`
	SubmissionID    string `json:"submissionId"`
	ClientVersion   int    `json:"clientVersion"`
	Outcome         string `json:"outcome"`
	Feedback        string `json:"feedback"`
	Pair            string `json:"pair"`
	Assistance      int    `json:"assistance"`
	FeedbackVersion string `json:"feedbackVersion,omitempty"`
}

func ValidateDraft(activity string, p Parameters, rules ResolvedRules, d Draft) error {
	if activity == "count" {
		if rules.Count == nil || rules.Answers == nil || !rules.Count.A.contains(p.A) || !rules.Count.B.contains(p.B) || !rules.Answers.contains(p.A+p.B) || p.Total != 0 {
			return invalid("problem outside pinned counting rules")
		}
		if d.Count == nil || d.Factor != nil {
			return invalid("expected count draft")
		}
		if d.Count.Answer != nil && !rules.Answers.contains(*d.Count.Answer) {
			return invalid(fmt.Sprintf("answer must be %d through %d", rules.Answers.Min, rules.Answers.Max))
		}
		seen := map[int]bool{}
		for _, id := range d.Count.Marked {
			if id < 1 || id > p.A+p.B || seen[id] {
				return invalid("unknown or duplicate counter")
			}
			seen[id] = true
		}
		return nil
	}
	if activity != "factor" || d.Factor == nil || d.Count != nil {
		return invalid("expected factor draft")
	}
	b := d.Factor
	if rules.Factor == nil || p.Total != rules.Factor.Total || !rules.Factor.frame(b.Width, b.Height) {
		return invalid("unsupported frame")
	}
	ids, cells := map[int]bool{}, map[[2]int]bool{}
	for _, t := range b.Tiles {
		cell := [2]int{t.X, t.Y}
		if t.ID < 1 || t.ID > p.Total || ids[t.ID] || cells[cell] || t.X < 0 || t.Y < 0 || t.X >= b.Width || t.Y >= b.Height {
			return invalid("unknown tile, duplicate, or out-of-frame cell")
		}
		ids[t.ID], cells[cell] = true, true
	}
	return nil
}

func Evaluate(activity string, p Parameters, d Draft) (result Result) {
	// Feedback is stored on each attempt. Old recorded prose and math-v1 lesson
	// pins remain intact; this identifies newly generated presentation text.
	defer func() { result.FeedbackVersion = "feedback-v2" }()
	if activity == "count" {
		if d.Count.Answer == nil {
			return Result{Outcome: "unfinished", Feedback: "Choose a number, then Check."}
		}
		if *d.Count.Answer == p.A+p.B {
			return Result{Outcome: "correct", Feedback: fmt.Sprintf("%d + %d = %d. That is how many altogether!", p.A, p.B, p.A+p.B)}
		}
		if p.A+p.B == 0 {
			return Result{Outcome: "retry", Feedback: "Both groups are empty. Try again."}
		}
		if p.A == 0 || p.B == 0 {
			return Result{Outcome: "retry", Feedback: "One group is empty. Count the counters in the other group."}
		}
		return Result{Outcome: "retry", Feedback: fmt.Sprintf("You chose %d. Count once more, then try again.", *d.Count.Answer)}
	}
	b := d.Factor
	if len(b.Tiles) < p.Total {
		remaining := p.Total - len(b.Tiles)
		words := "tiles are"
		if remaining == 1 {
			words = "tile is"
		}
		return Result{Outcome: "unfinished", Feedback: fmt.Sprintf("%d %s still in the tray. Fill the whole frame with all %d tiles.", remaining, words, p.Total)}
	}
	if b.Width*b.Height != p.Total {
		gaps := b.Width*b.Height - p.Total
		words := "empty cells"
		if gaps == 1 {
			words = "empty cell"
		}
		return Result{Outcome: "retry", Feedback: fmt.Sprintf("All %d tiles are on the board, but this %d × %d frame has %d %s. Try another width.", p.Total, b.Width, b.Height, gaps, words)}
	}
	lo, hi := b.Width, b.Height
	if lo > hi {
		lo, hi = hi, lo
	}
	return Result{Outcome: "correct", Pair: fmt.Sprintf("%d × %d", lo, hi), Feedback: fmt.Sprintf("%d × %d = %d × %d = %d. Same tiles. Same factor pair.", b.Width, b.Height, b.Height, b.Width, p.Total)}
}

func canonical(d Draft) string {
	if d.Count != nil {
		c := *d.Count
		c.Marked = append([]int{}, c.Marked...)
		sort.Ints(c.Marked)
		d.Count = &c
	}
	if d.Factor != nil {
		b := *d.Factor
		b.Tiles = append([]Tile{}, b.Tiles...)
		sort.Slice(b.Tiles, func(i, j int) bool { return b.Tiles[i].ID < b.Tiles[j].ID })
		d.Factor = &b
	}
	b, _ := json.Marshal(d)
	return string(b)
}
