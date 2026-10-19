#!/usr/bin/perl
# selftest.pl -- every rule of the guard proved in both directions.
#
# A rule that only has a failing case may be inert; a rule that only has a
# passing case may be blocking everything. Each entry below states the exit code
# the guard must return: 0 = the text is delivered, 1 = the text is refused.
#
#   perl tools/style_guard/selftest.pl
#   exit 0 = every case behaves as stated, exit 1 = the failures are listed.

use strict;
use warnings;
use File::Basename qw(dirname);

my $DIR   = dirname(__FILE__);
my $GUARD = "$DIR/check_output.pl";
my $TMP   = "$DIR/.selftest.tmp";

# name, expected exit, text
my @cases = (
  # --- code shown, not asserted -------------------------------------------
  ['fenced block',        0, "Ecco:\n\n```\n# soluzione elegante\n```\n\nFine.\n"],
  ['indented block',      0, "Ecco:\n\n    # soluzione elegante\n\nFine.\n"],
  ['tilde fence',         0, "Ecco:\n\n~~~\n# soluzione elegante\n~~~\n\nFine.\n"],
  ['list continuation',   1, "Testo:\n\n- voce\n\n    Questa \xc3\xa8 una scelta sbagliata.\n"],
  ['stray fence marker',  1, "A:\n\n```\ncodice con ``` dentro\n```\n\nQuesta \xc3\xa8 una scelta sbagliata.\n\n```\naltro\n```\n"],

  # --- quoting a verdict is not stating one --------------------------------
  ['guillemets',          0, "Ha scritto \xc2\xabl'idea \xc3\xa8 solida\xc2\xbb nel documento.\n"],
  ['curly quotes',        0, "Ha scritto \xe2\x80\x9cl'idea \xc3\xa8 solida\xe2\x80\x9d nel documento.\n"],
  ['straight quotes',     0, "Ha scritto \"l'idea \xc3\xa8 solida\" nel documento.\n"],
  ['unmatched quote',     1, "Il flag \"--file serve al controllo.\nQuesta \xc3\xa8 una scelta sbagliata.\nIl nome \xc3\xa8 \"kick_force\".\n"],
  ['bare verdict',        1, "Questa \xc3\xa8 una scelta sbagliata e va rifatta.\n"],

  # --- R2, the anchor ------------------------------------------------------
  ['anchor in backticks', 0, "La maggior parte dei percorsi passa da `ball.gd:42`.\n"],
  ['anchor plain',        0, "La maggior parte dei percorsi passa da ball.gd:42.\n"],
  ['no anchor',           1, "La maggior parte dei percorsi passa da quel nodo.\n"],

  # --- R3, the subject of the copula ---------------------------------------
  ['game quantity',       0, "Il fill-rate non \xc3\xa8 la risorsa scarsa.\n"],
  ['design choice',       1, "L'idea della Keeper Power \xc3\xa8 forte.\n"],
  ['noun inside pred',    1, "Quella \xc3\xa8 un'idea scarsa.\n"],
  ['bare subject',        0, "Il tiro \xc3\xa8 forte.\n"],
  ['complement noun',     1, "L'idea del portiere che para tutto \xc3\xa8 forte.\n"],
  ['subject plus compl',  0, "La velocit\xc3\xa0 della palla \xc3\xa8 forte.\n"],
  ['subject before comma',0, "Il tiro, che parte da lontano, \xc3\xa8 forte.\n"],
  ['after conjunction',   1, "Il tiro parte bene, ma l'idea \xc3\xa8 forte.\n"],
  ['fronted adjunct',     0, "All'apertura l'albero era pulito.\n"],
  ['clean code verdict',  1, "Il codice \xc3\xa8 pulito.\n"],
  ['subject with own compl',0, "Il tiro del portiere \xc3\xa8 forte.\n"],
  ['fronted prep chain',  0, "Nella misura di ieri il tiro \xc3\xa8 forte.\n"],

  # --- the half of the project that stays in English -----------------------
  ['english verdict',     1, "The current design is solid.\n"],
  ['english wrong',       1, "The approach is wrong.\n"],
  ['english quantity',    0, "The shot is strong.\n"],
  ['english choice',      1, "The idea is strong.\n"],
  ['english git tree',    0, "The tree is clean.\n"],
  ['english code',        1, "The code is clean.\n"],
  ['english comparative', 0, "This value is stronger than the previous one.\n"],
  ['english complement',  1, "The idea of the keeper that saves everything is strong.\n"],
);

# A list that does not load must refuse the turn instead of switching the guard
# off: die would leave exit 255, and the Stop hook contract blocks only on 2.
sub broken_list_case {
    my $dir = "$DIR/.selftest_broken";
    mkdir $dir unless -d $dir;
    for my $f (qw(macros.txt verdict_words.txt population_claims.txt
                  soft_verdicts.txt subject_exemptions.txt check_output.pl)) {
        open(my $in,  '<', "$DIR/$f") or return "  broken list: manca $f";
        open(my $out, '>', "$dir/$f") or return "  broken list: non scrivo $f";
        binmode $in; binmode $out;
        print $out $_ for <$in>;
        close $in; close $out;
    }
    open(my $fh, '>>', "$dir/verdict_words.txt") or return "  broken list: non estendo la lista";
    print $fh "\n\@NONESISTE(bell)[oaie]\n";
    close $fh;
    open($fh, '>', "$dir/text.md") or return "  broken list: non scrivo il testo";
    print $fh "Frase senza niente da segnalare.\n";
    close $fh;
    system($^X, "$dir/check_output.pl", '--file', "$dir/text.md");
    my $got = $? >> 8;
    unlink glob("$dir/*");
    rmdir $dir;
    return $got == 1 ? undef
                     : sprintf("  %-22s atteso 1, ottenuto %d", 'broken list', $got);
}

my @bad;
for my $c (@cases) {
    my ($name, $want, $text) = @$c;
    open(my $fh, '>', $TMP) or die "selftest: cannot write $TMP: $!\n";
    binmode $fh;
    print $fh $text;
    close $fh;
    system($^X, $GUARD, '--file', $TMP);
    my $got = $? >> 8;
    push @bad, sprintf("  %-20s atteso %d, ottenuto %d", $name, $want, $got)
        if $got != $want;
}
unlink $TMP;

my $broken = broken_list_case();
push @bad, $broken if defined $broken;

if (@bad) {
    print STDERR "selftest: " . scalar(@bad) . " caso/i fuori posto\n";
    print STDERR "$_\n" for @bad;
    exit 1;
}
print "selftest: " . (scalar(@cases) + 1) . " casi, tutti come dichiarato\n";
exit 0;
