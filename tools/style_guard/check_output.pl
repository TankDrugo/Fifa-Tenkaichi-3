#!/usr/bin/perl
# check_output.pl -- style guard for assistant analysis text.
#
# Enforces the "osservazione -> ancora -> conseguenza" rule as a checkable
# output constraint instead of a remembered intention.
#
#   R1  value predicates (verdict_words.txt)      -> always a violation
#   R2  claims about unobservable populations      -> violation unless the
#       (population_claims.txt)                       sentence carries an anchor
#                                                     (a digit or a URL)
#
# Two ways to run it:
#   Stop hook : hook JSON arrives on stdin, uses .last_assistant_message
#               exit 0 = let the message through, exit 2 = block and explain
#   standalone: perl check_output.pl --file some.md
#               exit 0 = clean, exit 1 = violations found
#
# Text inside fenced code blocks, inline code, blockquotes and quotation marks
# is skipped: quoting someone else's verdict is not stating one.

use strict;
use warnings;
use File::Basename qw(dirname);

my $DIR = dirname(__FILE__);

sub read_lines {
    my ($name, $optional) = @_;
    my $path = "$DIR/$name";
    unless (open(my $fh, '<', $path)) {
        return () if $optional;
        die "style_guard: cannot read $path: $!\n";
    }
    open(my $fh, '<', $path) or die "style_guard: cannot read $path: $!\n";
    my @lines = <$fh>;
    close $fh;
    return @lines;
}

sub load_terms {
    my ($name) = @_;
    my (@terms, %macro);
    # macros.txt is shared by every list, so the same fragment is defined once.
    for my $raw (read_lines('macros.txt', 1), read_lines($name)) {
        my $line = $raw;
        $line =~ s/\r?\n$//;
        $line =~ s/^\s+|\s+$//g;
        next if $line eq '' || $line =~ /^#/;
        # "@NAME = regex" defines a reusable fragment, expanded in the terms below.
        if ($line =~ /^\@(\w+)\s*=\s*(.+)$/) {
            $macro{$1} = $2;
            next;
        }
        push @terms, $line;
    }
    # Keep the line as written for the report, and the expanded form for matching:
    # an expanded macro is unreadable in an error message.
    my @out;
    for my $t (@terms) {
        my $re = $t;
        # A macro may be written in terms of another one, so expand until nothing
        # changes. The bound stops a macro that refers to itself from looping.
        for my $pass (1 .. 8) {
            my $before = $re;
            for my $k (sort { length($b) <=> length($a) } keys %macro) {
                $re =~ s/\@\Q$k\E/$macro{$k}/g;
            }
            last if $re eq $before;
        }
        die "style_guard: undefined or circular macro in $name: $t\n" if $re =~ /\@\w/;
        push @out, { src => $t, re => $re };
    }
    return @out;
}

sub json_unescape {
    my ($s) = @_;
    my %esc = ('n' => "\n", 't' => "\t", 'r' => "\r", 'b' => "\b",
               'f' => "\f", '"' => '"', '/' => '/');
    $esc{chr(92)} = chr(92);
    $s =~ s{[\x5C](u([0-9a-fA-F]{4})|.)}{
        defined $2 ? chr(hex($2)) : (exists $esc{$1} ? $esc{$1} : $1)
    }ge;
    return $s;
}

# A span that is skipped may still carry the anchor of the sentence around it
# (`ball.gd:42`), so a span holding a digit or a URL leaves a digit behind: the
# R2 anchor test runs on the cleaned text and must still see it. The newlines of
# the span are kept, or two lines would merge into one invented sentence.
sub blank_span {
    my ($s) = @_;
    my $nl = () = $s =~ /\n/g;
    my $keep = ($s =~ /[0-9]/ || $s =~ m{https?://}) ? ' 0 ' : ' ';
    return $keep . ("\n" x $nl);
}

# Spans that quote or show instead of asserting. Every pattern is bounded in the
# number of newlines it may cross: prose is hard-wrapped, so a real quotation
# needs a line break or two, while an unmatched delimiter that may pair with a
# far away one would swallow the sentences in between.
sub strip_spans {
    my ($t) = @_;
    $t =~ s/(`[^`\n]*(?:\n[^`\n]*)?`)/blank_span($1)/ge;                 # inline code
    $t =~ s/(\xC2\xAB[^\n]*?(?:\n[^\n]*?){0,4}\xC2\xBB)/blank_span($1)/ge;    # << >>
    $t =~ s/(\xE2\x80\x9C[^\n]*?(?:\n[^\n]*?){0,4}\xE2\x80\x9D)/blank_span($1)/ge; # curly
    $t =~ s/("[^"\n]{0,300}(?:\n[^"\n]{0,300})?")/blank_span($1)/ge;     # straight quotes
    $t =~ s/\]\([^)]*\)/ /g;                                             # link targets
    return $t;
}

# Remove the spans where a verdict is being quoted or shown, not asserted.
# Block delimiters are matched line by line: a stray fence inside a block used to
# shift every later pairing and hide the prose between two code blocks.
sub strip_quoted {
    my ($t) = @_;
    my @out;
    my ($fence, $indent, $prev_blank, $in_list) = ('', 0, 1, 0);
    my $ITEM = qr/^\s{0,3}(?:[-*+]\s|\d+[.)]\s)/;
    for my $line (split /\n/, $t, -1) {
        if ($fence ne '') {
            $fence = '' if $line =~ /^\s{0,3}\Q$fence\E\s*$/;
            push @out, ' ';
            $prev_blank = 0;
            next;
        }
        if ($line =~ /^\s{0,3}(`{3,}|~{3,})/) {
            $fence = $1;
            push @out, ' ';
            $prev_blank = 0;
            next;
        }
        my $blank = $line =~ /^\s*$/ ? 1 : 0;
        if ($indent) {
            if ($blank || $line =~ /^(?: {4}|\t)/) {
                push @out, ' ';
                $prev_blank = $blank;
                next;
            }
            $indent = 0;
        }
        # An indented code block opens after a blank line, and never inside a list:
        # a continuation paragraph of a list item carries the same indent.
        if ($prev_blank && !$in_list && $line =~ /^(?: {4}|\t)/) {
            $indent = 1;
            push @out, ' ';
            $prev_blank = 0;
            next;
        }
        if ($line =~ /^\s{0,3}>/) {
            push @out, ' ';
            $prev_blank = 0;
            next;
        }
        $in_list = 1 if $line =~ $ITEM;
        $in_list = 0 if !$blank && $line =~ /^\S/ && $line !~ $ITEM && $line !~ /^\|/;
        push @out, $line;
        $prev_blank = $blank;
    }
    return strip_spans(join "\n", @out);
}

sub sentences {


    my ($t) = @_;
    my @out;
    for my $chunk (split /\n+/, $t) {
        for my $s (split /(?<=[.!?;:])\s+/, $chunk) {
            $s =~ s/^\s+|\s+$//g;
            push @out, $s if $s ne '';
        }
    }
    return @out;
}

sub has_anchor {
    my ($s) = @_;
    return 1 if $s =~ /[0-9]/;
    return 1 if $s =~ m{https?://};
    return 0;
}

sub shorten {
    my ($s) = @_;
    $s =~ s/\s+/ /g;
    return length($s) > 110 ? substr($s, 0, 107) . '...' : $s;
}

# ---------------------------------------------------------------- input

my ($text, $hook_mode, $stop_hook_active) = ('', 0, 0);

if (@ARGV >= 2 && $ARGV[0] eq '--file') {
    open(my $fh, '<', $ARGV[1]) or die "style_guard: cannot read $ARGV[1]: $!\n";
    local $/; $text = <$fh>; close $fh;
} else {
    $hook_mode = 1;
    local $/; my $raw = <STDIN>;
    $raw = '' unless defined $raw;
    if ($raw =~ /"last_assistant_message"\s*:\s*"((?:[^"\x5C]|[\x5C].)*)"/s) {
        $text = json_unescape($1);
    }
    $stop_hook_active = 1 if $raw =~ /"stop_hook_active"\s*:\s*true/;
}

exit 0 if $text eq '';
# One enforcement round per turn: never block a message that is itself the
# rewrite requested by this hook, or the conversation cannot end.
exit 0 if $hook_mode && $stop_hook_active;

# ---------------------------------------------------------------- check

# The lists decide what is a violation, so a list that does not load leaves the
# message unchecked. Refusing is the safe direction: a typo in a list must stop
# the turn, not silently switch the guard off.
my (@verdicts, @population, @soft, @subjects);
eval {
    @verdicts   = load_terms('verdict_words.txt');
    @population = load_terms('population_claims.txt');
    @soft       = load_terms('soft_verdicts.txt');
    @subjects   = load_terms('subject_exemptions.txt');
    1;
} or do {
    my $err = $@ || "errore sconosciuto";
    $err =~ s/\s+$//;
    print STDERR "style_guard: le liste non caricano, il messaggio non e' stato controllato.\n";
    print STDERR "  $err\n";
    print STDERR "Correggi il file indicato in tools/style_guard/ e riprova.\n";
    exit($hook_mode ? 2 : 1);
};

# R3: the same adjective describes or judges depending on what it is said about,
# so the exemption has to find the SUBJECT of the copula and not any noun that
# happens to sit near it. "Il tiro è forte" measures; "L'idea del portiere che
# para tutto è forte" judges, and the nouns "portiere" and "para" belong to a
# complement and to a relative clause, not to the subject.
my $PREP   = qr/^(?:di|da|in|con|su|per|tra|fra|del|dello|della|dei|degli|delle|al|allo|alla|ai|agli|alle|dal|dallo|dalla|dai|dagli|dalle|nel|nello|nella|nei|negli|nelle|col|coi|sul|sullo|sulla|sui|sugli|sulle|of|in|on|for|with|from|by|to|at|into|over|under|between)$/i;
my $PREPAP = qr/^(?:dell|all|dall|nell|sull|coll)'/i;   # dell'idea, all'apertura
my $DET    = qr/^(?:il|lo|la|i|gli|le|un|uno|una|questo|questa|questi|queste|quel|quella|quelle|quegli|the|a|an|this|these|those)$/i;
my $DETAP  = qr/^(?:l|un)'/i;                            # l'albero, un'idea
my $REL    = qr/^(?:che|cui|quale|quali|chi|that|which|who|whose)$/i;

# The words of one clause that may carry the subject: a word introduced by a
# preposition belongs to the complement, and everything from a relative pronoun
# on belongs to the relative clause.
sub subject_words {
    my ($seg) = @_;
    my @out;
    my $after_prep = 0;
    for my $w (split /\s+/, $seg) {
        next if $w eq '';
        last if $w =~ $REL;
        # A preposition after a candidate opens the complement of that candidate,
        # and nothing behind it can be the subject any more. Before any candidate
        # it is a fronted adjunct ("All.apertura l.albero era pulito"), so the
        # subject may still arrive, announced by its determiner.
        if ($w =~ $PREP || $w =~ $PREPAP) {
            last if @out;
            $after_prep = 1;
            next;
        }
        if ($after_prep) {
            next unless $w =~ $DET || $w =~ $DETAP;
            $after_prep = 0;
        }
        push @out, $w;
    }
    return @out;
}

sub has_subject {
    my ($text) = @_;
    for my $g (@subjects) {
        return 1 if $text =~ /(?<![\w])(?:$g->{re})(?![\w])/i;
    }
    return 0;
}

sub subject_is_exempt {
    my ($sent, $at, $match) = @_;
    # @PRED swallows the noun group, so in "non è la risorsa scarsa" the subject
    # sits inside the matched text and never appears in front of it.
    return 1 if defined $match && has_subject($match);
    # A comma or a dash opens another clause: the subject of the copula is in the
    # last clause that has one, so the segments are read from the right and the
    # empty ones are skipped ("Il tiro, che parte da lontano, è forte").
    my @segments = split /\s*(?:,|\xE2\x80\x94|--)\s*/, substr($sent, 0, $at), -1;
    for my $seg (reverse @segments) {
        my @words = subject_words($seg);
        next unless @words;
        return has_subject(join ' ', @words);
    }
    return 0;
}

my $clean = strip_quoted($text);
my @hits;

for my $s (sentences($clean)) {
    for my $term (@verdicts) {
        if ($s =~ /(?<![\w])(?:$term->{re})(?![\w])/i) {
            push @hits, { rule => 'R1', term => $term->{src}, sent => $s };
            last;
        }
    }
    for my $term (@soft) {
        if ($s =~ /(?<![\w])(?:$term->{re})(?![\w])/i) {
            next if subject_is_exempt($s, $-[0], $&);
            push @hits, { rule => 'R3', term => $term->{src}, sent => $s };
            last;
        }
    }
    next if has_anchor($s);
    for my $term (@population) {
        if ($s =~ /(?<![\w])(?:$term->{re})(?![\w])/i) {
            push @hits, { rule => 'R2', term => $term->{src}, sent => $s };
            last;
        }
    }
}

exit 0 unless @hits;

# ---------------------------------------------------------------- report

my $n = scalar @hits;
print STDERR "style_guard: $n frase/i da riscrivere prima di consegnare.\n\n";
for my $h (@hits) {
    if ($h->{rule} eq 'R1') {
        print STDERR "  R1 predicato di valore [$h->{term}]\n";
    } elsif ($h->{rule} eq 'R3') {
        print STDERR "  R3 giudizio su una scelta di progetto [$h->{term}]\n";
        print STDERR "     (se il soggetto e' una grandezza di gioco, aggiungilo a subject_exemptions.txt)\n";
    } else {
        print STDERR "  R2 affermazione su una popolazione non osservabile, senza ancora [$h->{term}]\n";
    }
    print STDERR "     " . shorten($h->{sent}) . "\n\n";
}
print STDERR "Riscrivi ogni frase nella forma: osservazione -> ancora -> conseguenza.\n";
print STDERR "L'ancora e' un numero misurato, un riferimento file:riga, o un URL.\n";
print STDERR "Se una frase non ha ancora, toglila invece di ammorbidirla.\n";

exit($hook_mode ? 2 : 1);
