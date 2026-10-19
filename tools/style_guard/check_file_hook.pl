#!/usr/bin/perl
# check_file_hook.pl -- PostToolUse hook: run the style guard on a markdown file
# that a chat has just written.
#
# The Stop hook inspects messages, but the product of the project is files, and a
# violation written into a document is never seen by it. This one warns and never
# blocks: the write has already happened, and the four chats must not be stopped
# in the middle of their work by a sentence they can fix afterwards.
#
#   exit 0 = nothing to say (not a markdown file, or no violation)
#   exit 1 = non-blocking warning, listed on stderr

use strict;
use warnings;
use File::Basename qw(dirname);

my $DIR   = dirname(__FILE__);
my $GUARD = "$DIR/check_output.pl";

local $/;
my $raw = <STDIN>;
exit 0 unless defined $raw && $raw ne '';

exit 0 unless $raw =~ /"file_path"\s*:\s*"((?:[^"\x5C]|[\x5C].)*)"/s;
my $path = $1;
$path =~ s/[\x5C](.)/$1 eq 'n' ? "\n" : $1 eq 't' ? "\t" : $1/ge;

exit 0 unless $path =~ /\.md$/i;
exit 0 if $path =~ /addons/;   # third party documentation
exit 0 unless -f $path;

open(my $out, '-|', $^X, $GUARD, '--file', $path) or exit 0;
close $out;

my $status = $?;
exit 0 if $status == 0;

# The guard writes its report on stderr, which is already on the way to the user;
# this only says which file it was about, since the hook fires on a write.
print STDERR "style_guard: $path e' stato scritto con delle frasi da rivedere (avviso, non blocco).\n";
exit 1;
